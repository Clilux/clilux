import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Returns the Technician record linked to the currently logged-in user.
 * Matches by user_email === current user email, or falls back to email field.
 */
export function useCurrentTechnician() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 60 * 1000,
  });

  const { data: technician = null, isLoading } = useQuery({
    queryKey: ['technician-by-user', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      // Try matching by user_email first (new field), fallback to email
      let techs = await base44.entities.Technician.filter({ user_email: user.email });
      if (techs.length === 0) {
        techs = await base44.entities.Technician.filter({ email: user.email });
      }
      return techs[0] || null;
    },
    enabled: !!user?.email,
  });

  return { technician, user, isLoading };
}