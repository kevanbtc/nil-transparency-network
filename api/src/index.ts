import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// POST /api/deals - Create NIL deal (mint ContractNFT + register Compliance)
app.post('/api/deals', async (req, res) => {
  try {
    const { athleteVault, brand, amount, termsHash, splits, jurisdiction } = req.body;
    
    // Validate required fields
    if (!athleteVault || !brand || !amount || !termsHash || !splits || !jurisdiction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate deal ID
    const dealId = uuidv4();

    // TODO: Integrate with smart contracts
    // const contractNFT = await mintDealContract({
    //   athleteVault,
    //   brand,
    //   amount,
    //   termsHash,
    //   splits
    // });

    // TODO: Register compliance attestation
    // await registerComplianceAttestation(dealId, jurisdiction);

    // TODO: Write to database
    // await db.query(
    //   'INSERT INTO deals (id, chain_deal_id, athlete_vault, brand_address, amount_wei, terms_hash, jurisdiction, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    //   [uuidv4(), dealId, athleteVault, brand, amount, termsHash, jurisdiction, 'CREATED']
    // );

    res.status(201).json({
      dealId,
      status: 'created',
      contractNFT: 'mock_nft_id',
      message: 'Deal created successfully'
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/deals/:dealId/approve - Approve compliance (unblock payouts)
app.post('/api/deals/:dealId/approve', async (req, res) => {
  try {
    const { dealId } = req.params;

    // TODO: Write ComplianceApproved to smart contract
    // await complianceRegistry.approveCompliance(dealId);

    // TODO: Update database
    // await db.query(
    //   'UPDATE deals SET status = $1 WHERE chain_deal_id = $2',
    //   ['APPROVED', dealId]
    // );

    res.json({
      dealId,
      status: 'approved',
      message: 'Deal compliance approved'
    });
  } catch (error) {
    console.error('Error approving deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/payouts/:dealId - Execute payout via RevenueSplitter
app.post('/api/payouts/:dealId', async (req, res) => {
  try {
    const { dealId } = req.params;

    // TODO: Execute RevenueSplitter.distribute()
    // const tx = await revenueSplitter.distribute(dealId);

    // TODO: Write PayoutExecuted event
    // const payoutId = uuidv4();
    // await db.query(
    //   'INSERT INTO payouts (id, deal_id, tx_hash, amounts, executed_at) VALUES ($1, $2, $3, $4, $5)',
    //   [payoutId, dealId, 'mock_tx_hash', JSON.stringify([]), new Date()]
    // );

    // TODO: Trigger ISO 20022 service
    // await iso20022Service.generatePaymentMessage(dealId, payoutDetails);

    res.json({
      dealId,
      txHash: 'mock_tx_hash',
      status: 'executed',
      message: 'Payout executed successfully'
    });
  } catch (error) {
    console.error('Error executing payout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`NIL Transparency API server running on port ${PORT}`);
});