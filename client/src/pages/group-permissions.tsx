import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Key, ChevronRight, Eye, Plus, Pencil, Trash2, Save } from "lucide-react";

interface UserGroup {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface NavigationItem {
  id: string;
  tenantId: string;
  parentId: string | null;
  title: string;
  path: string | null;
  iconName: string | null;
  itemOrder: number;
}

interface GroupPermission {
  id: string;
  tenantId: string;
  groupId: string;
  navigationItemId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  inheritToChildren: boolean;
}

interface PermissionState {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  inheritToChildren: boolean;
}

export default function GroupPermissionsPage() {
  const { activeTenant } = useSettings();
  const { toast } = useToast();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, PermissionState>>({});

  const { data: userGroups = [] } = useQuery<UserGroup[]>({
    queryKey: ["/api/user-groups", activeTenant?.id],
    queryFn: async () => {
      const res = await fetch(`/api/user-groups?tenantId=${activeTenant?.id}`);
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const { data: navigationItems = [] } = useQuery<NavigationItem[]>({
    queryKey: ["/api/navigation", activeTenant?.id],
    queryFn: async () => {
      const res = await fetch(`/api/navigation?tenantId=${activeTenant?.id}`);
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const { data: groupPermissions = [] } = useQuery<GroupPermission[]>({
    queryKey: ["/api/user-groups", selectedGroupId, "permissions"],
    queryFn: async () => {
      const res = await fetch(`/api/user-groups/${selectedGroupId}/permissions`);
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  const savePermissionMutation = useMutation({
    mutationFn: async (data: { navigationItemId: string; permissions: PermissionState }) => {
      return apiRequest("POST", `/api/user-groups/${selectedGroupId}/permissions`, {
        tenantId: activeTenant?.id,
        navigationItemId: data.navigationItemId,
        ...data.permissions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", selectedGroupId, "permissions"] });
    },
  });

  const handleSaveAll = async () => {
    const promises = Object.entries(pendingChanges).map(([navItemId, permissions]) =>
      savePermissionMutation.mutateAsync({ navigationItemId: navItemId, permissions })
    );
    
    try {
      await Promise.all(promises);
      setPendingChanges({});
      toast({ title: "Permissions Saved", description: "All permission changes have been saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save some permissions.", variant: "destructive" });
    }
  };

  const getPermissionForItem = (navItemId: string): PermissionState => {
    if (pendingChanges[navItemId]) {
      return pendingChanges[navItemId];
    }
    const existing = groupPermissions.find(p => p.navigationItemId === navItemId);
    if (existing) {
      return {
        canView: existing.canView,
        canCreate: existing.canCreate,
        canEdit: existing.canEdit,
        canDelete: existing.canDelete,
        inheritToChildren: existing.inheritToChildren,
      };
    }
    return { canView: false, canCreate: false, canEdit: false, canDelete: false, inheritToChildren: true };
  };

  const updatePermission = (navItemId: string, field: keyof PermissionState, value: boolean) => {
    const current = getPermissionForItem(navItemId);
    setPendingChanges(prev => ({
      ...prev,
      [navItemId]: { ...current, [field]: value },
    }));
  };

  const parentItems = navigationItems.filter(item => !item.parentId);
  const getChildren = (parentId: string) => navigationItems.filter(item => item.parentId === parentId);

  const selectedGroup = userGroups.find(g => g.id === selectedGroupId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            Form Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure which forms and modules each user group can access
          </p>
        </div>
        {Object.keys(pendingChanges).length > 0 && (
          <Button onClick={handleSaveAll} data-testid="button-save-permissions">
            <Save className="h-4 w-4 mr-2" />
            Save Changes ({Object.keys(pendingChanges).length})
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select User Group</CardTitle>
          <CardDescription>
            Choose a group to configure its form access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-user-group">
              <SelectValue placeholder="Select a user group..." />
            </SelectTrigger>
            <SelectContent>
              {userGroups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                  {!group.isActive && " (Inactive)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedGroup && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Permissions for {selectedGroup.name}
            </CardTitle>
            <CardDescription>
              Check the permissions to grant access. Parent permissions can inherit to child forms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Form / Module</th>
                    <th className="text-center py-3 px-2 font-medium w-20">
                      <div className="flex flex-col items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span className="text-xs">View</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-medium w-20">
                      <div className="flex flex-col items-center gap-1">
                        <Plus className="h-4 w-4" />
                        <span className="text-xs">Create</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-medium w-20">
                      <div className="flex flex-col items-center gap-1">
                        <Pencil className="h-4 w-4" />
                        <span className="text-xs">Edit</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-medium w-20">
                      <div className="flex flex-col items-center gap-1">
                        <Trash2 className="h-4 w-4" />
                        <span className="text-xs">Delete</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-medium w-24">
                      <span className="text-xs">Inherit to Children</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parentItems.map(parent => {
                    const children = getChildren(parent.id);
                    const parentPerm = getPermissionForItem(parent.id);
                    const hasChanges = !!pendingChanges[parent.id];
                    
                    return (
                      <>
                        <tr key={parent.id} className={`border-b ${hasChanges ? "bg-primary/5" : ""}`}>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2 font-medium">
                              {parent.title}
                              {hasChanges && <Badge variant="outline" className="text-xs">Modified</Badge>}
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            <Checkbox
                              checked={parentPerm.canView}
                              onCheckedChange={(checked) => updatePermission(parent.id, "canView", !!checked)}
                              data-testid={`checkbox-view-${parent.id}`}
                            />
                          </td>
                          <td className="text-center py-3 px-2">
                            <Checkbox
                              checked={parentPerm.canCreate}
                              onCheckedChange={(checked) => updatePermission(parent.id, "canCreate", !!checked)}
                              data-testid={`checkbox-create-${parent.id}`}
                            />
                          </td>
                          <td className="text-center py-3 px-2">
                            <Checkbox
                              checked={parentPerm.canEdit}
                              onCheckedChange={(checked) => updatePermission(parent.id, "canEdit", !!checked)}
                              data-testid={`checkbox-edit-${parent.id}`}
                            />
                          </td>
                          <td className="text-center py-3 px-2">
                            <Checkbox
                              checked={parentPerm.canDelete}
                              onCheckedChange={(checked) => updatePermission(parent.id, "canDelete", !!checked)}
                              data-testid={`checkbox-delete-${parent.id}`}
                            />
                          </td>
                          <td className="text-center py-3 px-2">
                            <Checkbox
                              checked={parentPerm.inheritToChildren}
                              onCheckedChange={(checked) => updatePermission(parent.id, "inheritToChildren", !!checked)}
                              data-testid={`checkbox-inherit-${parent.id}`}
                            />
                          </td>
                        </tr>
                        {children.map(child => {
                          const childPerm = getPermissionForItem(child.id);
                          const childHasChanges = !!pendingChanges[child.id];
                          const inheritedFromParent = parentPerm.inheritToChildren && parentPerm.canView;
                          
                          return (
                            <tr key={child.id} className={`border-b ${childHasChanges ? "bg-primary/5" : ""}`}>
                              <td className="py-2 px-2 pl-8">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <ChevronRight className="h-4 w-4" />
                                  {child.title}
                                  {inheritedFromParent && (
                                    <Badge variant="secondary" className="text-xs">Inherited</Badge>
                                  )}
                                  {childHasChanges && <Badge variant="outline" className="text-xs">Modified</Badge>}
                                </div>
                              </td>
                              <td className="text-center py-2 px-2">
                                <Checkbox
                                  checked={childPerm.canView || inheritedFromParent}
                                  onCheckedChange={(checked) => updatePermission(child.id, "canView", !!checked)}
                                  disabled={inheritedFromParent}
                                  data-testid={`checkbox-view-${child.id}`}
                                />
                              </td>
                              <td className="text-center py-2 px-2">
                                <Checkbox
                                  checked={childPerm.canCreate || (parentPerm.inheritToChildren && parentPerm.canCreate)}
                                  onCheckedChange={(checked) => updatePermission(child.id, "canCreate", !!checked)}
                                  disabled={parentPerm.inheritToChildren && parentPerm.canCreate}
                                  data-testid={`checkbox-create-${child.id}`}
                                />
                              </td>
                              <td className="text-center py-2 px-2">
                                <Checkbox
                                  checked={childPerm.canEdit || (parentPerm.inheritToChildren && parentPerm.canEdit)}
                                  onCheckedChange={(checked) => updatePermission(child.id, "canEdit", !!checked)}
                                  disabled={parentPerm.inheritToChildren && parentPerm.canEdit}
                                  data-testid={`checkbox-edit-${child.id}`}
                                />
                              </td>
                              <td className="text-center py-2 px-2">
                                <Checkbox
                                  checked={childPerm.canDelete || (parentPerm.inheritToChildren && parentPerm.canDelete)}
                                  onCheckedChange={(checked) => updatePermission(child.id, "canDelete", !!checked)}
                                  disabled={parentPerm.inheritToChildren && parentPerm.canDelete}
                                  data-testid={`checkbox-delete-${child.id}`}
                                />
                              </td>
                              <td className="text-center py-2 px-2">
                                <span className="text-xs text-muted-foreground">-</span>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedGroup && userGroups.length > 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Key className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a user group to configure permissions</p>
          <p className="text-sm">Use the dropdown above to choose a group</p>
        </div>
      )}

      {userGroups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Key className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No user groups available</p>
          <p className="text-sm">Create user groups first to configure permissions</p>
        </div>
      )}
    </div>
  );
}
