export type AuditLogsPluginConfig = {
  auditLog: {
    enabled: boolean;
    excludeContentTypes: string[];
  };
};

export const defaultConfig: AuditLogsPluginConfig = {
  auditLog: {
    enabled: true,
    excludeContentTypes: [],
  },
};


