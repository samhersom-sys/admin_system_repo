import type { DashboardConfig, ReportTemplate } from './reporting.service'

export type CoreDashboardTemplate = ReportTemplate & {
    coreSlug: string
    dashboardConfig: DashboardConfig
}

export const CORE_DASHBOARD_TEMPLATES: Record<string, CoreDashboardTemplate> = {
    'core-user-policy-performance': {
        id: -101,
        coreSlug: 'core-user-policy-performance',
        name: 'User Policy Performance Dashboard',
        description: 'Per-user policy KPI and premium performance overview.',
        type: 'dashboard',
        created_by: 'System',
        dashboardConfig: {
            pages: [
                {
                    id: 1,
                    name: 'Overview',
                    template: 'twoRow',
                    widgets: [
                        {
                            id: 'core-user-policy-kpi-table',
                            slotId: 1,
                            title: 'User Policy KPI Table',
                            type: 'table',
                            attributes: [
                                'policyUserSummary::hierarchyLevel1',
                                'policyUserSummary::hierarchyLevel2',
                                'policyUserSummary::hierarchyLevel3',
                                'policyUserSummary::hierarchyLevel4',
                                'policyUserSummary::hierarchyLevel5',
                                'policyUserSummary::user',
                                'policyUserSummary::expiringPolicyCount',
                                'policyUserSummary::renewablePolicyCount',
                                'policyUserSummary::newBusinessPolicyCount',
                                'policyUserSummary::renewedPolicyCount',
                                'policyUserSummary::lapsedPolicyCount',
                                'policyUserSummary::cancelledPolicyCount',
                                'policyUserSummary::policyCount',
                                'policyUserSummary::retentionRatio',
                                'policyUserSummary::netNewPolicyCount',
                            ],
                        },
                        {
                            id: 'core-user-policy-premium-table',
                            slotId: 2,
                            title: 'User Gross Written Premium Table',
                            type: 'table',
                            attributes: [
                                'policyUserSummary::hierarchyLevel1',
                                'policyUserSummary::hierarchyLevel2',
                                'policyUserSummary::hierarchyLevel3',
                                'policyUserSummary::hierarchyLevel4',
                                'policyUserSummary::hierarchyLevel5',
                                'policyUserSummary::user',
                                'policyUserSummary::expiringGrossWrittenPremium',
                                'policyUserSummary::renewableGrossWrittenPremium',
                                'policyUserSummary::newBusinessGrossWrittenPremium',
                                'policyUserSummary::renewedGrossWrittenPremium',
                                'policyUserSummary::lapsedGrossWrittenPremium',
                                'policyUserSummary::cancelledGrossWrittenPremium',
                                'policyUserSummary::policyGrossWrittenPremium',
                                'policyUserSummary::retentionRatioGrossWrittenPremium',
                                'policyUserSummary::netNewGrossWrittenPremium',
                            ],
                        },
                    ],
                    scrollEnabled: false,
                    maxRows: 12,
                    sections: null,
                },
            ],
            showMetadata: true,
        },
    },
}
