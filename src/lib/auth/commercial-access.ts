// Membership is read from the database; user-editable auth metadata never grants access.
export function hasCommercialAccess(
  profile: { role: string; is_active: boolean } | null | undefined,
  membership: { status: string } | null | undefined,
): boolean {
  return Boolean(
    profile?.is_active &&
      ["customer", "admin"].includes(profile.role) &&
      membership &&
      ["active", "invited"].includes(membership.status),
  );
}
