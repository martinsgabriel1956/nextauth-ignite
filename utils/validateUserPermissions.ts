interface User {
  permissions: string[];
  roles: string[];
}

interface ValidateUserPermissionsOptions {
  user: User;
  permissions?: string[];
  roles?: string[];
}

export function validateUserPermissions({ user, permissions, roles }: ValidateUserPermissionsOptions) {
  if(permissions?.length > 0) {
    const hasAllPermissions = permissions?.every(permission => user?.permissions.includes(permission));
    
    if(!hasAllPermissions) {
      return false;
    }
  }

  if(roles?.length > 0) {
    const hasAllRoles = roles?.some(permission => user?.roles.includes(permission));
    
    if(!hasAllRoles) {
      return false;
    }
  }
  
  return true;
};