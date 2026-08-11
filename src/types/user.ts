export type UserRole = "customer" | "admin";

export type Company = {
  id: string;
  name: string;
  vatNumber: string | null;
  billingEmail: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  assignedSalesRepId: string | null;
  customerSegment: string | null;
  creditLimit: number | null;
  paymentTerms: string | null;
  isActive: boolean;
  createdAt: string;
};

export type Profile = {
  id: string;
  companyId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};
