/**
 * ISO 20022 Message Service
 * Builds pacs.008/pain.001/camt.* messages for NIL transparency
 * Stores signed XML + hash ref on-chain
 */

import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import crypto from 'crypto';
import fs from 'fs';

export interface NILTransaction {
  id: string;
  deal_id: string;
  athlete_name: string;
  athlete_id: string;
  brand_name: string;
  brand_id: string;
  amount: number;
  currency: string;
  vault_address: string;
  platform: string;
  deliverables: string;
  compliance_status: string;
  created_at: Date;
}

export interface ISO20022Message {
  message_type: string;
  message_id: string;
  creation_date_time: string;
  initiating_party: {
    name: string;
    identification: string;
  };
  beneficiary: {
    name: string;
    account: string;
    identification: string;
  };
  amount: {
    instructed_amount: number;
    currency: string;
  };
  purpose_code: string;
  remittance_info: {
    unstructured: string;
    structured: {
      deal_id: string;
      platform_source: string;
      compliance_check: string;
    };
  };
}

export class ISO20022MessageService {
  private builder: XMLBuilder;
  private parser: XMLParser;

  constructor() {
    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true
    });

    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
  }

  /**
   * Generate pacs.008 (CustomerCreditTransfer) message for NIL payment
   */
  generatePacs008(transaction: NILTransaction): { xml: string; hash: string } {
    const messageId = `NIL-${transaction.id}-${Date.now()}`;
    
    const pacs008 = {
      Document: {
        '@_xmlns': 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08',
        FIToFICstmrCdtTrf: {
          GrpHdr: {
            MsgId: messageId,
            CreDtTm: new Date().toISOString(),
            NbOfTxs: '1',
            TtlIntrBkSttlmAmt: {
              '@_Ccy': transaction.currency,
              '#text': transaction.amount.toFixed(2)
            },
            SttlmInf: {
              SttlmMtd: 'CLRG',
              ClrgsCtgy: 'NIL' // Custom clearing category for NIL
            },
            InstgAgt: {
              FinInstnId: {
                BICFI: 'NILBANK1',
                Nm: 'NIL Transparency Network'
              }
            },
            InstdAgt: {
              FinInstnId: {
                BICFI: 'SILOBANK',
                Nm: 'SiloBank Processing'
              }
            }
          },
          CdtTrfTxInf: {
            PmtId: {
              InstrId: transaction.id,
              EndToEndId: `NIL-${transaction.deal_id}`,
              TxId: transaction.id
            },
            IntrBkSttlmAmt: {
              '@_Ccy': transaction.currency,
              '#text': transaction.amount.toFixed(2)
            },
            SttlmPrty: 'HIGH', // High priority for athlete payments
            SttlmTmIndctn: {
              DbtDtTm: new Date().toISOString()
            },
            Dbtr: {
              Nm: transaction.brand_name,
              Id: {
                OrgId: {
                  Othr: {
                    Id: transaction.brand_id,
                    SchmeNm: {
                      Cd: 'TXID'
                    }
                  }
                }
              }
            },
            DbtrAcct: {
              Id: {
                Othr: {
                  Id: `BRAND-${transaction.brand_id}`,
                  SchmeNm: {
                    Cd: 'BBAN'
                  }
                }
              }
            },
            DbtrAgt: {
              FinInstnId: {
                BICFI: 'NILBANK1',
                Nm: 'NIL Transparency Network'
              }
            },
            Cdtr: {
              Nm: transaction.athlete_name,
              Id: {
                PrvtId: {
                  Othr: {
                    Id: transaction.athlete_id,
                    SchmeNm: {
                      Cd: 'TXID'
                    }
                  }
                }
              }
            },
            CdtrAcct: {
              Id: {
                Othr: {
                  Id: transaction.vault_address,
                  SchmeNm: {
                    Cd: 'BBAN'
                  }
                }
              }
            },
            CdtrAgt: {
              FinInstnId: {
                BICFI: 'SILOBANK',
                Nm: 'SiloBank Processing'
              }
            },
            Purp: {
              Cd: 'CBFF' // Commercial payment
            },
            RmtInf: {
              Ustrd: `NIL payment for ${transaction.deliverables} via ${transaction.platform}`,
              Strd: {
                RfrdDocInf: {
                  Tp: {
                    CdOrPrtry: {
                      Cd: 'CINV' // Commercial invoice
                    }
                  },
                  Nb: transaction.deal_id,
                  RltdDt: transaction.created_at.toISOString().split('T')[0]
                },
                AddtlRmtInf: `Platform: ${transaction.platform}, Compliance: ${transaction.compliance_status}`
              }
            }
          }
        }
      }
    };

    const xml = this.builder.build(pacs008);
    const hash = this.generateMessageHash(xml);

    return { xml, hash };
  }

  /**
   * Generate message hash for on-chain reference
   */
  private generateMessageHash(xml: string): string {
    return crypto.createHash('sha256').update(xml).digest('hex');
  }

  /**
   * Sign XML message (simplified implementation)
   */
  signMessage(xml: string, privateKey: string): string {
    const signature = crypto.sign('sha256', Buffer.from(xml), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING
    });
    
    // In practice, this would add XML signature elements
    return xml.replace('</Document>', `<Signature>${signature.toString('base64')}</Signature></Document>`);
  }

  /**
   * Save message to file
   */
  saveMessage(xml: string, hash: string, messageType: string, transactionId: string): string {
    const filename = `${messageType}-${transactionId}-${hash.substring(0, 8)}.xml`;
    const filepath = `./messages/${filename}`;
    
    // Ensure directory exists
    if (!fs.existsSync('./messages')) {
      fs.mkdirSync('./messages', { recursive: true });
    }
    
    fs.writeFileSync(filepath, xml);
    return filepath;
  }

  /**
   * Validate ISO 20022 message structure
   */
  validateMessage(xml: string, messageType: string): { valid: boolean; errors: string[] } {
    try {
      const parsed = this.parser.parse(xml);
      const errors: string[] = [];

      // Basic validation checks
      if (!parsed.Document) {
        errors.push('Missing Document root element');
      }

      // Message type specific validation
      if (messageType === 'pacs.008' && !parsed.Document?.FIToFICstmrCdtTrf) {
        errors.push('Invalid pacs.008 structure');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`XML parsing error: ${error.message}`]
      };
    }
  }
}

export default ISO20022MessageService;