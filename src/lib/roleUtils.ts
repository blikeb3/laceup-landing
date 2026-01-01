import { supabase } from "@/integrations/supabase/client";

export interface UserRoles {
  baseRole: string | null;
  hasAdminRole: boolean;
}

/**
 * Fetch and parse user roles from the database
 * Handles multiple roles per user (e.g., admin + athlete)
 * @param userId - The user ID to fetch roles for
 * @returns Object with baseRole (non-admin role) and hasAdminRole flag
 */
export const fetchUserRoles = async (userId: string): Promise<UserRoles> => {
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = roleData?.map(r => r.role) || [];
  const baseRole = roles.find(r => r !== 'admin') || null;
  const hasAdminRole = roles.includes('admin');

  return {
    baseRole,
    hasAdminRole,
  };
};

/**
 * Fetch roles for multiple users in a single query
 * @param userIds - Array of user IDs to fetch roles for
 * @returns Map of userId -> UserRoles
 */
export const fetchMultipleUserRoles = async (
  userIds: string[]
): Promise<Map<string, UserRoles>> => {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);

  const rolesMap = new Map<string, UserRoles>();

  // Initialize all users with default values
  userIds.forEach(id => {
    rolesMap.set(id, {
      baseRole: null,
      hasAdminRole: false,
    });
  });

  // Group roles by user
  const userRolesMap = new Map<string, string[]>();
  rolesData?.forEach(roleRow => {
    if (!userRolesMap.has(roleRow.user_id)) {
      userRolesMap.set(roleRow.user_id, []);
    }
    userRolesMap.get(roleRow.user_id)!.push(roleRow.role);
  });

  // Process each user's roles
  userRolesMap.forEach((roles, userId) => {
    const baseRole = roles.find(r => r !== 'admin') || null;
    const hasAdminRole = roles.includes('admin');
    rolesMap.set(userId, {
      baseRole,
      hasAdminRole,
    });
  });

  return rolesMap;
};
