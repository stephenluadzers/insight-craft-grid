import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Key, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  Settings2,
  Lock,
  Users,
  Building2,
  FileKey,
  Globe,
  RefreshCw
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SSOProvider {
  id: string;
  name: string;
  type: "oidc" | "saml";
  enabled: boolean;
  configured: boolean;
  icon: string;
}

const defaultProviders: SSOProvider[] = [
  { id: "okta", name: "Okta", type: "oidc", enabled: false, configured: false, icon: "🔐" },
  { id: "keycloak", name: "Keycloak", type: "oidc", enabled: false, configured: false, icon: "🛡️" },
  { id: "azure-ad", name: "Azure AD", type: "oidc", enabled: false, configured: false, icon: "☁️" },
  { id: "google", name: "Google Workspace", type: "oidc", enabled: false, configured: false, icon: "🔵" },
  { id: "auth0", name: "Auth0", type: "oidc", enabled: false, configured: false, icon: "🔒" },
  { id: "onelogin", name: "OneLogin", type: "saml", enabled: false, configured: false, icon: "1️⃣" },
];

interface SSOConfigurationPanelProps {
  workspaceId: string;
}

export function SSOConfigurationPanel({ workspaceId }: SSOConfigurationPanelProps) {
  const { toast } = useToast();
  const [providers, setProviders] = useState<SSOProvider[]>(defaultProviders);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [enforceSso, setEnforceSso] = useState(false);
  const [allowBypass, setAllowBypass] = useState(true);
  
  // OIDC Configuration
  const [oidcConfig, setOidcConfig] = useState({
    clientId: "",
    clientSecret: "",
    issuerUrl: "",
    redirectUri: `${window.location.origin}/auth/callback`,
    scopes: "openid profile email",
    userInfoEndpoint: "",
    tokenEndpoint: "",
    authorizationEndpoint: "",
  });

  // SAML Configuration
  const [samlConfig, setSamlConfig] = useState({
    entityId: "",
    acsUrl: `${window.location.origin}/auth/saml/callback`,
    sloUrl: "",
    certificate: "",
    signRequest: true,
    nameIdFormat: "emailAddress",
    attributeMapping: {
      email: "email",
      firstName: "firstName",
      lastName: "lastName",
      groups: "groups",
    },
  });

  const [roleMapping, setRoleMapping] = useState([
    { ssoGroup: "", appRole: "viewer" },
  ]);

  const handleProviderToggle = (providerId: string, enabled: boolean) => {
    setProviders(providers.map(p => 
      p.id === providerId ? { ...p, enabled } : p
    ));
    
    if (enabled) {
      setSelectedProvider(providerId);
    }

    toast({
      title: enabled ? "Provider Enabled" : "Provider Disabled",
      description: `${providers.find(p => p.id === providerId)?.name} has been ${enabled ? "enabled" : "disabled"}.`,
    });
  };

  const handleTestConnection = async () => {
    toast({
      title: "Testing Connection...",
      description: "Validating SSO configuration.",
    });

    // Simulate connection test
    setTimeout(() => {
      toast({
        title: "Connection Successful",
        description: "SSO provider is correctly configured and responding.",
      });
    }, 1500);
  };

  const handleSaveConfiguration = async () => {
    toast({
      title: "Saving Configuration...",
      description: "Storing SSO settings securely.",
    });

    // In a real implementation, this would save to Supabase
    setTimeout(() => {
      setProviders(providers.map(p => 
        p.id === selectedProvider ? { ...p, configured: true } : p
      ));
      
      toast({
        title: "Configuration Saved",
        description: "SSO settings have been saved successfully.",
      });
    }, 1000);
  };

  const addRoleMapping = () => {
    setRoleMapping([...roleMapping, { ssoGroup: "", appRole: "viewer" }]);
  };

  const removeRoleMapping = (index: number) => {
    setRoleMapping(roleMapping.filter((_, i) => i !== index));
  };

  const selectedProviderData = providers.find(p => p.id === selectedProvider);

  return (
    <div className="space-y-6">
      {/* SSO Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Single Sign-On (SSO)
              </CardTitle>
              <CardDescription>
                Configure enterprise SSO with OIDC or SAML 2.0 providers
              </CardDescription>
            </div>
            <Badge variant={ssoEnabled ? "default" : "secondary"}>
              {ssoEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global SSO Settings */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Enable SSO</Label>
                <p className="text-xs text-muted-foreground">Allow SSO authentication</p>
              </div>
              <Switch checked={ssoEnabled} onCheckedChange={setSsoEnabled} />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Enforce SSO</Label>
                <p className="text-xs text-muted-foreground">Require SSO for all users</p>
              </div>
              <Switch 
                checked={enforceSso} 
                onCheckedChange={setEnforceSso} 
                disabled={!ssoEnabled}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Allow Bypass</Label>
                <p className="text-xs text-muted-foreground">Let admins use password</p>
              </div>
              <Switch 
                checked={allowBypass} 
                onCheckedChange={setAllowBypass}
                disabled={!enforceSso}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Identity Providers
          </CardTitle>
          <CardDescription>
            Select and configure your SSO identity provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedProvider === provider.id 
                    ? "border-primary bg-primary/5" 
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <h4 className="font-medium">{provider.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {provider.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={provider.enabled}
                    onCheckedChange={(checked) => handleProviderToggle(provider.id, checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {provider.configured ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {provider.configured ? "Configured" : "Not configured"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider Configuration */}
      {selectedProvider && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configure {selectedProviderData?.name}
            </CardTitle>
            <CardDescription>
              Enter your {selectedProviderData?.type.toUpperCase()} configuration details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={selectedProviderData?.type || "oidc"}>
              <TabsList className="mb-4">
                <TabsTrigger value="oidc" disabled={selectedProviderData?.type !== "oidc"}>
                  OIDC Configuration
                </TabsTrigger>
                <TabsTrigger value="saml" disabled={selectedProviderData?.type !== "saml"}>
                  SAML Configuration
                </TabsTrigger>
                <TabsTrigger value="roles">Role Mapping</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* OIDC Configuration */}
              <TabsContent value="oidc" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      value={oidcConfig.clientId}
                      onChange={(e) => setOidcConfig({ ...oidcConfig, clientId: e.target.value })}
                      placeholder="Enter client ID from your IdP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientSecret">Client Secret</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      value={oidcConfig.clientSecret}
                      onChange={(e) => setOidcConfig({ ...oidcConfig, clientSecret: e.target.value })}
                      placeholder="Enter client secret"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="issuerUrl">Issuer URL</Label>
                    <Input
                      id="issuerUrl"
                      value={oidcConfig.issuerUrl}
                      onChange={(e) => setOidcConfig({ ...oidcConfig, issuerUrl: e.target.value })}
                      placeholder="https://your-idp.example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      The OIDC discovery endpoint will be derived from this URL
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redirectUri">Redirect URI</Label>
                    <div className="flex gap-2">
                      <Input
                        id="redirectUri"
                        value={oidcConfig.redirectUri}
                        readOnly
                        className="bg-muted"
                      />
                      <Button variant="outline" size="icon" onClick={() => {
                        navigator.clipboard.writeText(oidcConfig.redirectUri);
                        toast({ title: "Copied to clipboard" });
                      }}>
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add this URL to your IdP's allowed redirect URIs
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scopes">Scopes</Label>
                    <Input
                      id="scopes"
                      value={oidcConfig.scopes}
                      onChange={(e) => setOidcConfig({ ...oidcConfig, scopes: e.target.value })}
                      placeholder="openid profile email"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Endpoint Configuration (Optional)</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Leave blank to use OIDC discovery. Only set if your IdP doesn't support discovery.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Authorization Endpoint</Label>
                      <Input
                        value={oidcConfig.authorizationEndpoint}
                        onChange={(e) => setOidcConfig({ ...oidcConfig, authorizationEndpoint: e.target.value })}
                        placeholder="Auto-discovered"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Token Endpoint</Label>
                      <Input
                        value={oidcConfig.tokenEndpoint}
                        onChange={(e) => setOidcConfig({ ...oidcConfig, tokenEndpoint: e.target.value })}
                        placeholder="Auto-discovered"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>UserInfo Endpoint</Label>
                      <Input
                        value={oidcConfig.userInfoEndpoint}
                        onChange={(e) => setOidcConfig({ ...oidcConfig, userInfoEndpoint: e.target.value })}
                        placeholder="Auto-discovered"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* SAML Configuration */}
              <TabsContent value="saml" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="entityId">Entity ID (Issuer)</Label>
                    <Input
                      id="entityId"
                      value={samlConfig.entityId}
                      onChange={(e) => setSamlConfig({ ...samlConfig, entityId: e.target.value })}
                      placeholder="urn:your-app:entity-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NameID Format</Label>
                    <Select
                      value={samlConfig.nameIdFormat}
                      onValueChange={(value) => setSamlConfig({ ...samlConfig, nameIdFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emailAddress">Email Address</SelectItem>
                        <SelectItem value="persistent">Persistent</SelectItem>
                        <SelectItem value="transient">Transient</SelectItem>
                        <SelectItem value="unspecified">Unspecified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acsUrl">ACS URL (Callback)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="acsUrl"
                        value={samlConfig.acsUrl}
                        readOnly
                        className="bg-muted"
                      />
                      <Button variant="outline" size="icon" onClick={() => {
                        navigator.clipboard.writeText(samlConfig.acsUrl);
                        toast({ title: "Copied to clipboard" });
                      }}>
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sloUrl">SLO URL (Single Logout)</Label>
                    <Input
                      id="sloUrl"
                      value={samlConfig.sloUrl}
                      onChange={(e) => setSamlConfig({ ...samlConfig, sloUrl: e.target.value })}
                      placeholder="https://idp.example.com/logout"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="certificate">IdP Certificate (X.509)</Label>
                    <Textarea
                      id="certificate"
                      value={samlConfig.certificate}
                      onChange={(e) => setSamlConfig({ ...samlConfig, certificate: e.target.value })}
                      placeholder="-----BEGIN CERTIFICATE-----&#10;MIICmzCC...&#10;-----END CERTIFICATE-----"
                      className="font-mono text-xs h-32"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-4 border rounded-lg">
                  <Switch
                    checked={samlConfig.signRequest}
                    onCheckedChange={(checked) => setSamlConfig({ ...samlConfig, signRequest: checked })}
                  />
                  <div>
                    <Label>Sign Authentication Requests</Label>
                    <p className="text-xs text-muted-foreground">
                      Recommended for enhanced security
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Attribute Mapping</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Email Attribute</Label>
                      <Input
                        value={samlConfig.attributeMapping.email}
                        onChange={(e) => setSamlConfig({
                          ...samlConfig,
                          attributeMapping: { ...samlConfig.attributeMapping, email: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>First Name Attribute</Label>
                      <Input
                        value={samlConfig.attributeMapping.firstName}
                        onChange={(e) => setSamlConfig({
                          ...samlConfig,
                          attributeMapping: { ...samlConfig.attributeMapping, firstName: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name Attribute</Label>
                      <Input
                        value={samlConfig.attributeMapping.lastName}
                        onChange={(e) => setSamlConfig({
                          ...samlConfig,
                          attributeMapping: { ...samlConfig.attributeMapping, lastName: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Groups Attribute</Label>
                      <Input
                        value={samlConfig.attributeMapping.groups}
                        onChange={(e) => setSamlConfig({
                          ...samlConfig,
                          attributeMapping: { ...samlConfig.attributeMapping, groups: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Role Mapping */}
              <TabsContent value="roles" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">Role Mapping</h4>
                    <p className="text-sm text-muted-foreground">
                      Map SSO groups to application roles
                    </p>
                  </div>
                  <Button onClick={addRoleMapping} variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Add Mapping
                  </Button>
                </div>

                <div className="space-y-3">
                  {roleMapping.map((mapping, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      <div className="flex-1 space-y-2">
                        <Label>SSO Group / Claim</Label>
                        <Input
                          value={mapping.ssoGroup}
                          onChange={(e) => {
                            const newMappings = [...roleMapping];
                            newMappings[index].ssoGroup = e.target.value;
                            setRoleMapping(newMappings);
                          }}
                          placeholder="e.g., admins, developers, viewers"
                        />
                      </div>
                      <div className="w-48 space-y-2">
                        <Label>App Role</Label>
                        <Select
                          value={mapping.appRole}
                          onValueChange={(value) => {
                            const newMappings = [...roleMapping];
                            newMappings[index].appRole = value;
                            setRoleMapping(newMappings);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRoleMapping(index)}
                        disabled={roleMapping.length === 1}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-muted rounded-lg mt-4">
                  <h5 className="font-medium mb-2">Default Role</h5>
                  <p className="text-sm text-muted-foreground mb-3">
                    Users without a matching group will be assigned this role
                  </p>
                  <Select defaultValue="viewer">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="none">No Access (Reject)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Advanced Settings */}
              <TabsContent value="advanced" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Just-in-Time Provisioning</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically create user accounts on first login
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Update User Attributes on Login</Label>
                      <p className="text-xs text-muted-foreground">
                        Sync name, email, and groups from IdP on each login
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Allow Password Login for SSO Users</Label>
                      <p className="text-xs text-muted-foreground">
                        Users provisioned via SSO can also use password
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Session Timeout (hours)</Label>
                      <p className="text-xs text-muted-foreground">
                        How long SSO sessions remain valid
                      </p>
                    </div>
                    <Input type="number" defaultValue="24" className="w-24" />
                  </div>

                  <div className="p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-yellow-700 dark:text-yellow-400">
                          Clock Skew Tolerance
                        </h5>
                        <p className="text-sm text-muted-foreground mt-1">
                          If you experience SAML assertion timestamp errors, increase the clock skew tolerance.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Input type="number" defaultValue="30" className="w-24" />
                          <span className="text-sm text-muted-foreground">seconds</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t mt-6">
              <Button onClick={handleTestConnection} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
              <Button onClick={handleSaveConfiguration}>
                <Lock className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
