/**
 * European Sports Marketing Platform Adapter
 * Integrates with European NIL platforms and ensures GDPR compliance
 */

import { UniversalAdapterBase, UniversalAthleteProfile, UniversalNILDeal, PlatformCapabilities } from './UniversalAdapter';

export class EuropeanSportsAdapter extends UniversalAdapterBase {
  
  async getPlatformInfo(): Promise<{
    name: string;
    version: string;
    capabilities: PlatformCapabilities;
    supported_regions: string[];
  }> {
    return {
      name: 'European Sports Marketing Platform',
      version: '2.1.0',
      capabilities: {
        supported_jurisdictions: ['EU', 'UK', 'FR', 'DE', 'ES', 'IT', 'NL'],
        supported_currencies: ['EUR', 'GBP', 'USDC', 'EURS'],
        max_deal_amount: {
          'EUR': 500000,
          'GBP': 450000,
          'USDC': 550000,
          'EURS': 500000
        },
        compliance_integrations: ['GDPR', 'MiFID II', 'PSD2', 'Anti-Money Laundering Directive'],
        real_time_notifications: true,
        webhook_support: true,
        api_rate_limits: {
          requests_per_minute: 300,
          burst_limit: 50
        },
        data_retention_days: 2555, // 7 years as required by EU law
        supports_cross_border_deals: true
      },
      supported_regions: [
        'European Union',
        'United Kingdom', 
        'European Economic Area',
        'Switzerland'
      ]
    };
  }

  async registerAthlete(profile: UniversalAthleteProfile): Promise<string> {
    // Ensure GDPR compliance for EU athletes
    const gdprCompliantProfile = await this.sanitizeForGDPR(profile);
    
    // Deploy vault with EU-specific compliance
    const vaultAddress = await this.deployAthleteVault(profile.id, profile.jurisdiction);
    
    // Register with European sports marketing platform
    const registration = await this.makeApiCall('POST', '/eu/athletes/register', {
      ...gdprCompliantProfile,
      vault_address: vaultAddress,
      gdpr_consent: true,
      data_processing_consent: this.getDataProcessingConsent(profile.jurisdiction),
      cookie_consent: true,
      marketing_consent: false // Opt-in required
    });

    // Set up European data protection compliance
    await this.setupEUDataProtection(profile.id, profile.jurisdiction);
    
    return registration.athlete_id;
  }

  async createDeal(deal: UniversalNILDeal): Promise<string> {
    // Check if this is a cross-border deal within EU
    const isEUCrossBorder = this.isEUCrossBorderDeal(deal);
    
    // Apply EU-specific compliance checks
    const complianceChecks = await this.performEUComplianceChecks(deal);
    
    if (!complianceChecks.approved) {
      throw new Error(`EU compliance check failed: ${complianceChecks.reason}`);
    }

    // Convert to EUR if needed for EU reporting
    let dealInEUR = deal;
    if (deal.currency !== 'EUR' && this.requiresEURReporting(deal.jurisdiction)) {
      const conversion = await this.convertCurrency(deal.currency, 'EUR', deal.amount, deal.athlete_id);
      dealInEUR = { ...deal, amount: conversion.converted_amount, currency: 'EUR' };
    }

    // Create deal with EU-specific metadata
    const response = await this.makeApiCall('POST', '/eu/deals/create', {
      ...dealInEUR,
      eu_cross_border: isEUCrossBorder,
      mifid_classification: this.getMiFIDClassification(deal),
      vat_treatment: this.getVATTreatment(deal),
      withholding_tax: this.calculateWithholdingTax(deal),
      gdpr_data_categories: this.identifyGDPRDataCategories(deal)
    });

    // Submit to multi-jurisdiction compliance
    if (isEUCrossBorder) {
      await this.submitEUCrossBorderCompliance(response.deal_id, deal);
    }

    return response.deal_id;
  }

  // EU-specific helper methods
  private async sanitizeForGDPR(profile: UniversalAthleteProfile): Promise<UniversalAthleteProfile> {
    // Remove or encrypt sensitive data according to GDPR
    return {
      ...profile,
      // Pseudonymize certain fields
      name: this.pseudonymizeIfRequired(profile.name, profile.jurisdiction),
      social_handles: profile.social_handles.map(handle => ({
        ...handle,
        handle: this.pseudonymizeIfRequired(handle.handle, profile.jurisdiction)
      }))
    };
  }

  private async setupEUDataProtection(athlete_id: string, jurisdiction: string): Promise<void> {
    const dataProtectionRules = {
      gdpr_applicable: this.isGDPRApplicable(jurisdiction),
      data_retention_period: 2555, // days
      right_to_erasure: true,
      right_to_portability: true,
      right_to_rectification: true,
      consent_withdrawal: true,
      automated_decision_making: false,
      cross_border_transfer_restrictions: this.getCrossBorderRestrictions(jurisdiction)
    };

    await this.makeApiCall('POST', `/eu/athletes/${athlete_id}/data-protection`, dataProtectionRules);
  }

  private isEUCrossBorderDeal(deal: UniversalNILDeal): boolean {
    const euJurisdictions = ['EU', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT'];
    
    // This would require getting athlete and brand jurisdictions
    // Simplified for this example
    return deal.cross_border && euJurisdictions.includes(deal.jurisdiction);
  }

  private async performEUComplianceChecks(deal: UniversalNILDeal): Promise<{ approved: boolean; reason: string }> {
    // Check MiFID II requirements for investment services
    if (this.isMiFIDApplicable(deal)) {
      const mifidCheck = await this.checkMiFIDCompliance(deal);
      if (!mifidCheck.approved) {
        return { approved: false, reason: 'MiFID II compliance failed' };
      }
    }

    // Check PSD2 requirements for payments
    if (this.isPSD2Applicable(deal)) {
      const psd2Check = await this.checkPSD2Compliance(deal);
      if (!psd2Check.approved) {
        return { approved: false, reason: 'PSD2 compliance failed' };
      }
    }

    // Check AML requirements
    const amlCheck = await this.checkEUAMLCompliance(deal);
    if (!amlCheck.approved) {
      return { approved: false, reason: 'EU AML compliance failed' };
    }

    return { approved: true, reason: 'All EU compliance checks passed' };
  }

  private requiresEURReporting(jurisdiction: string): boolean {
    const eurReportingJurisdictions = ['EU', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT'];
    return eurReportingJurisdictions.includes(jurisdiction);
  }

  private getMiFIDClassification(deal: UniversalNILDeal): string {
    // Classify deal under MiFID II if applicable
    if (deal.amount > 100000) return 'professional_client';
    return 'retail_client';
  }

  private getVATTreatment(deal: UniversalNILDeal): {
    vat_applicable: boolean;
    vat_rate: number;
    vat_jurisdiction: string;
  } {
    // Determine VAT treatment based on jurisdiction and deal type
    return {
      vat_applicable: true,
      vat_rate: this.getStandardVATRate(deal.jurisdiction),
      vat_jurisdiction: deal.jurisdiction
    };
  }

  private calculateWithholdingTax(deal: UniversalNILDeal): {
    applicable: boolean;
    rate: number;
    treaty_benefits: boolean;
  } {
    // Calculate withholding tax for cross-border payments
    return {
      applicable: deal.cross_border,
      rate: this.getWithholdingTaxRate(deal.jurisdiction),
      treaty_benefits: this.hasTaxTreatyBenefits(deal.jurisdiction)
    };
  }

  private identifyGDPRDataCategories(_deal: UniversalNILDeal): string[] {
    // Identify what types of personal data are processed
    return [
      'identity_data',
      'contact_data',
      'financial_data',
      'profile_data',
      'usage_data',
      'marketing_data'
    ];
  }

  private async submitEUCrossBorderCompliance(deal_id: string, deal: UniversalNILDeal): Promise<void> {
    // Submit cross-border deal for additional EU compliance review
    await this.makeApiCall('POST', '/eu/compliance/cross-border', {
      deal_id,
      reporting_requirements: this.getEUReportingRequirements(deal),
      tax_implications: this.getEUTaxImplications(deal),
      currency_exchange_reporting: deal.currency !== 'EUR'
    });
  }

  // Utility methods for EU-specific logic
  private pseudonymizeIfRequired(data: string, jurisdiction: string): string {
    // Implement pseudonymization for GDPR compliance
    if (this.isGDPRApplicable(jurisdiction)) {
      // This would implement actual pseudonymization logic
      return `***${data.slice(-4)}`; // Simplified example
    }
    return data;
  }

  private isGDPRApplicable(jurisdiction: string): boolean {
    const gdprJurisdictions = ['EU', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'IE', 'DK', 'SE', 'FI'];
    return gdprJurisdictions.includes(jurisdiction);
  }

  private getDataProcessingConsent(jurisdiction: string): {
    explicit_consent_required: boolean;
    legitimate_interest_basis: boolean;
    contract_performance_basis: boolean;
  } {
    if (this.isGDPRApplicable(jurisdiction)) {
      return {
        explicit_consent_required: true,
        legitimate_interest_basis: false,
        contract_performance_basis: true
      };
    }
    
    return {
      explicit_consent_required: false,
      legitimate_interest_basis: true,
      contract_performance_basis: true
    };
  }

  private getCrossBorderRestrictions(_jurisdiction: string): {
    restricted_countries: string[];
    adequacy_decision_required: boolean;
    standard_contractual_clauses: boolean;
  } {
    return {
      restricted_countries: ['CN', 'RU'], // Countries without adequacy decisions
      adequacy_decision_required: true,
      standard_contractual_clauses: true
    };
  }

  private isMiFIDApplicable(deal: UniversalNILDeal): boolean {
    // MiFID II applies to investment services and financial instruments
    return deal.amount > 50000; // Simplified threshold
  }

  private async checkMiFIDCompliance(_deal: UniversalNILDeal): Promise<{ approved: boolean; reason?: string }> {
    // Implementation would check MiFID II requirements
    return { approved: true };
  }

  private isPSD2Applicable(_deal: UniversalNILDeal): boolean {
    // PSD2 applies to payment services in EU
    return true; // All deals involve payments
  }

  private async checkPSD2Compliance(_deal: UniversalNILDeal): Promise<{ approved: boolean; reason?: string }> {
    // Implementation would check PSD2 requirements
    return { approved: true };
  }

  private async checkEUAMLCompliance(_deal: UniversalNILDeal): Promise<{ approved: boolean; reason?: string }> {
    // Implementation would check EU Anti-Money Laundering Directive requirements
    return { approved: true };
  }

  private getStandardVATRate(jurisdiction: string): number {
    const vatRates: { [key: string]: number } = {
      'EU': 20, // Average EU VAT rate
      'FR': 20,
      'DE': 19,
      'ES': 21,
      'IT': 22,
      'NL': 21,
      'BE': 21,
      'AT': 20,
      'UK': 20
    };
    
    return vatRates[jurisdiction] || 20;
  }

  private getWithholdingTaxRate(jurisdiction: string): number {
    const witholdingRates: { [key: string]: number } = {
      'EU': 5,
      'UK': 10,
      'FR': 5,
      'DE': 5,
      'ES': 5,
      'IT': 8
    };
    
    return witholdingRates[jurisdiction] || 10;
  }

  private hasTaxTreatyBenefits(jurisdiction: string): boolean {
    // Most EU countries have tax treaties with each other
    const treatyJurisdictions = ['EU', 'UK', 'FR', 'DE', 'ES', 'IT', 'NL'];
    return treatyJurisdictions.includes(jurisdiction);
  }

  private getEUReportingRequirements(deal: UniversalNILDeal): any {
    return {
      dac6_reporting: deal.amount > 250000, // DAC6 mandatory disclosure rules
      country_by_country_reporting: false,
      beneficial_ownership_reporting: true
    };
  }

  private getEUTaxImplications(deal: UniversalNILDeal): any {
    return {
      source_taxation: true,
      residence_taxation: true,
      withholding_tax: this.calculateWithholdingTax(deal),
      vat_treatment: this.getVATTreatment(deal)
    };
  }
}