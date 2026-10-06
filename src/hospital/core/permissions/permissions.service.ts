import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

/**
 * Resolves the effective feature codes a hospital user may access.
 *
 * A user's permissions come exclusively through assigned roles:
 *   HospitalUser → UserRoleAssignment → HospitalRole → HospitalRolePermission
 *     → ModuleFeature → Feature.code
 *
 * Only active roles are considered. Results are cached per (tenant, user)
 * for the lifetime of the request-scoped guard invocation via a short-lived
 * in-process map keyed by tenant+user+minute bucket is deliberately avoided —
 * we keep it simple and query once per guarded request.
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePermissionCodes(
    tenantId: string,
    userId: string,
  ): Promise<Set<string>> {
    const user = await this.prisma.hospitalUser.findFirst({
      where: { id: userId, tenantId },
      select: {
        roles: {
          where: { hospitalRole: { isActive: true } },
          select: {
            hospitalRole: {
              select: {
                permissions: {
                  select: {
                    moduleFeature: {
                      select: { feature: { select: { code: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const codes = new Set<string>();
    if (!user) return codes;

    for (const assignment of user.roles) {
      for (const perm of assignment.hospitalRole.permissions) {
        codes.add(perm.moduleFeature.feature.code);
      }
    }

    return codes;
  }
}
