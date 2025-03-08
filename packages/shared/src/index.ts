// Shared types and utilities for the expense tracker application

// Example expense type that could be shared between frontend and backend
export interface Expense {
    id: string;
    amount: number;
    description: string;
    category: string;
    date: string;
    receipt?: string;
}

// Example category type
export type ExpenseCategory =
    | 'Food'
    | 'Transportation'
    | 'Housing'
    | 'Entertainment'
    | 'Utilities'
    | 'Healthcare'
    | 'Other';

// Example utility function
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}; 