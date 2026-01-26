import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Users, Pencil, Trash2, Key, UserPlus } from "lucide-react";

interface UserGroup {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TenantUser {
  id: string;
  email: string;
  role: string;
  profile: {
    firstName: string | null;
    lastName: string | null;
    jobTitle: string | null;
  };
}

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  tenantId: string;
}

export default function UserGroupsPage() {
  const { activeTenant } = useSettings();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  const { data: userGroups = [], isLoading } = useQuery<UserGroup[]>({
    queryKey: ["/api/user-groups", activeTenant?.id],
    queryFn: async () => {
      const res = await fetch(`/api/user-groups?tenantId=${activeTenant?.id}`);
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const { data: teamMembers = [] } = useQuery<TenantUser[]>({
    queryKey: ["/api/team"],
  });

  const { data: groupMembers = [] } = useQuery<GroupMember[]>({
    queryKey: ["/api/user-groups", selectedGroup?.id, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/user-groups/${selectedGroup?.id}/members`);
      return res.json();
    },
    enabled: !!selectedGroup?.id,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("POST", "/api/user-groups", {
        tenantId: activeTenant?.id,
        name: data.name,
        description: data.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      setIsCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      toast({ title: "Group Created", description: "User group has been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create user group.", variant: "destructive" });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/user-groups/${data.id}`, {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      setEditingGroup(null);
      toast({ title: "Group Updated", description: "User group has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user group.", variant: "destructive" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/user-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      if (selectedGroup?.id === editingGroup?.id) {
        setSelectedGroup(null);
      }
      toast({ title: "Group Deleted", description: "User group has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete user group.", variant: "destructive" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/user-groups/${selectedGroup?.id}/members`, {
        tenantId: activeTenant?.id,
        userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", selectedGroup?.id, "members"] });
      toast({ title: "Member Added", description: "User has been added to the group." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add user to group.", variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/user-groups/${selectedGroup?.id}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups", selectedGroup?.id, "members"] });
      toast({ title: "Member Removed", description: "User has been removed from the group." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove user from group.", variant: "destructive" });
    },
  });

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroupMutation.mutate({ name: newGroupName.trim(), description: newGroupDescription.trim() });
    }
  };

  const handleUpdateGroup = () => {
    if (editingGroup && editingGroup.name.trim()) {
      updateGroupMutation.mutate({
        id: editingGroup.id,
        name: editingGroup.name,
        description: editingGroup.description || "",
        isActive: editingGroup.isActive,
      });
    }
  };

  const memberUserIds = groupMembers.map(m => m.userId);
  const availableUsers = teamMembers.filter(u => !memberUserIds.includes(u.id));

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            User Group Security
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user groups and their access permissions to forms and modules
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-group">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User Group</DialogTitle>
              <DialogDescription>
                Create a new user group to manage access permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Project Managers"
                  data-testid="input-group-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupDescription">Description</Label>
                <Textarea
                  id="groupDescription"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Describe the purpose of this group..."
                  data-testid="input-group-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()} data-testid="button-save-group">
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Groups
            </CardTitle>
            <CardDescription>
              {userGroups.length} group{userGroups.length !== 1 ? "s" : ""} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No user groups created yet</p>
                <p className="text-sm">Create a group to start managing permissions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover-elevate ${
                      selectedGroup?.id === group.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setSelectedGroup(group)}
                    data-testid={`group-item-${group.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{group.name}</h3>
                          {!group.isActive && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGroup(group);
                          }}
                          data-testid={`button-edit-group-${group.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this group?")) {
                              deleteGroupMutation.mutate(group.id);
                            }
                          }}
                          data-testid={`button-delete-group-${group.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Group Members
            </CardTitle>
            <CardDescription>
              {selectedGroup ? `Members of ${selectedGroup.name}` : "Select a group to manage members"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedGroup ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a group from the list</p>
                <p className="text-sm">to view and manage its members</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Members</Label>
                  {groupMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No members in this group</p>
                  ) : (
                    <div className="space-y-2">
                      {groupMembers.map((member) => {
                        const user = teamMembers.find(u => u.id === member.userId);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {user?.profile?.firstName} {user?.profile?.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMemberMutation.mutate(member.userId)}
                              data-testid={`button-remove-member-${member.userId}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {availableUsers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Add Members</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded-md border"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {user.profile?.firstName} {user.profile?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addMemberMutation.mutate(user.id)}
                            data-testid={`button-add-member-${user.id}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Group</DialogTitle>
            <DialogDescription>
              Update the group details
            </DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editGroupName">Group Name</Label>
                <Input
                  id="editGroupName"
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  data-testid="input-edit-group-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editGroupDescription">Description</Label>
                <Textarea
                  id="editGroupDescription"
                  value={editingGroup.description || ""}
                  onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  data-testid="input-edit-group-description"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="editGroupActive">Active</Label>
                <Switch
                  id="editGroupActive"
                  checked={editingGroup.isActive}
                  onCheckedChange={(checked) => setEditingGroup({ ...editingGroup, isActive: checked })}
                  data-testid="switch-group-active"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup} data-testid="button-update-group">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
