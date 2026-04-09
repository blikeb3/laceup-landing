import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserRoles, UserRoles } from '@/lib/roleUtils';

interface CurrentUserRoleState extends UserRoles {
  loading: boolean;
}

export const useCurrentUserRole = (): CurrentUserRoleState => {
  const { user, loading: authLoading } = useAuth();
  const [baseRole, setBaseRole] = useState<string | null>(null);
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setBaseRole(null);
      setHasAdminRole(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchUserRoles(user.id).then(({ baseRole, hasAdminRole }) => {
      setBaseRole(baseRole);
      setHasAdminRole(hasAdminRole);
      setLoading(false);
    });
  }, [user?.id, authLoading]);

  return { baseRole, hasAdminRole, loading };
};
