package dev.projectflow.billing;

/**
 * The plans, their prices in paise (1 rupee = 100 paise) and their limits. One place for the
 * numbers on the server; frontend/src/features/public/pricing.ts shows the same ones and must be
 * kept in step with this file.
 *
 * Prices are per workspace (the account that owns the projects), not per member. Viewers (usually
 * clients) never count towards the people limit.
 */
public enum Plan {
    FREE("Free", 0, 0, 3, 5),
    PRO("Pro", 999_00, 9_990_00, 0, 15),
    TEAM("Team", 2_499_00, 24_990_00, 0, 50);

    private final String label;
    private final int monthPaise;
    private final int yearPaise;
    private final int maxActiveProjects;
    private final int maxPeoplePerProject;

    Plan(String label, int monthPaise, int yearPaise, int maxActiveProjects, int maxPeoplePerProject) {
        this.label = label;
        this.monthPaise = monthPaise;
        this.yearPaise = yearPaise;
        this.maxActiveProjects = maxActiveProjects;
        this.maxPeoplePerProject = maxPeoplePerProject;
    }

    public String label() {
        return label;
    }

    public boolean paid() {
        return this != FREE;
    }

    /** The price of one period, in paise. */
    public int pricePaise(BillingPeriod period) {
        return period == BillingPeriod.YEAR ? yearPaise : monthPaise;
    }

    /** Active (or on hold) projects one account can own; 0 means the plan sets no limit. */
    public int maxActiveProjects() {
        return maxActiveProjects;
    }

    /** Owners, managers and members in one project (pending invitations included); viewers are free. */
    public int maxPeoplePerProject() {
        return maxPeoplePerProject;
    }

    /** Value of one second of this plan, for turning unused time into time on another plan. */
    double paisePerSecond() {
        return monthPaise / (30.0 * 24 * 3600);
    }
}
