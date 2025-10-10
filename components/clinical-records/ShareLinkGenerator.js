/**
 * ShareLinkGenerator Component
 * Mobile-optimized secure sharing link generator for clinical records
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert, Clipboard } from 'react-native';
import { 
  Card, 
  Text, 
  useTheme, 
  Button,
  TextInput,
  Switch,
  Chip,
  IconButton,
  Divider
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';

const ShareLinkGenerator = ({
  title = "Share Clinical Record",
  record,
  onGenerateLink,
  onRevokeLink,
  existingLinks = [],
  style,
  ...props
}) => {
  const theme = useTheme();
  
  const [shareSettings, setShareSettings] = useState({
    expirationDays: 7,
    requirePassword: false,
    password: '',
    allowDownload: true,
    allowPrint: false,
    recipientEmail: '',
    recipientName: '',
    message: '',
    notifyOnAccess: true,
  });

  const [generatedLink, setGeneratedLink] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateSetting = (key, value) => {
    setShareSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateLink = async () => {
    if (!record) {
      Alert.alert('Error', 'No record selected for sharing');
      return;
    }

    if (shareSettings.requirePassword && !shareSettings.password) {
      Alert.alert('Error', 'Password is required when password protection is enabled');
      return;
    }

    setIsGenerating(true);
    
    try {
      const linkData = {
        recordId: record.id,
        settings: shareSettings,
        createdAt: new Date().toISOString(),
      };

      if (onGenerateLink) {
        const result = await onGenerateLink(linkData);
        setGeneratedLink(result);
      } else {
        // Mock generated link for demo
        const mockLink = {
          id: Date.now().toString(),
          url: `https://rxdoctor.app/shared/${Date.now()}`,
          token: `share_${Date.now()}`,
          expiresAt: new Date(Date.now() + shareSettings.expirationDays * 24 * 60 * 60 * 1000).toISOString(),
          ...linkData,
        };
        setGeneratedLink(mockLink);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate sharing link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async (link) => {
    try {
      await Clipboard.setString(link.url);
      Alert.alert('Success', 'Link copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleRevokeLink = async (linkId) => {
    Alert.alert(
      'Revoke Link',
      'Are you sure you want to revoke this sharing link? It will no longer be accessible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onRevokeLink) {
                await onRevokeLink(linkId);
              }
              // Remove from local state
              if (generatedLink && generatedLink.id === linkId) {
                setGeneratedLink(null);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke link');
            }
          },
        },
      ]
    );
  };

  const getExpirationOptions = () => [
    { label: '1 Day', value: 1 },
    { label: '3 Days', value: 3 },
    { label: '1 Week', value: 7 },
    { label: '2 Weeks', value: 14 },
    { label: '1 Month', value: 30 },
    { label: '3 Months', value: 90 },
  ];

  const isLinkExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  const getLinkStatusColor = (link) => {
    if (isLinkExpired(link.expiresAt)) return theme.colors.error;
    if (link.accessCount > 0) return theme.colors.success;
    return theme.colors.warning;
  };

  const getLinkStatusText = (link) => {
    if (isLinkExpired(link.expiresAt)) return 'Expired';
    if (link.accessCount > 0) return 'Accessed';
    return 'Active';
  };

  if (!record) {
    return (
      <Card style={[styles.card, style]} mode="contained" {...props}>
        <Card.Content style={styles.content}>
          <View style={styles.emptyContainer}>
            <Icon name="share" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
              No record selected for sharing
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, style]} mode="contained" {...props}>
      <Card.Content style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text 
            variant="titleMedium" 
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
        </View>

        {/* Record Info */}
        <View style={styles.recordInfo}>
          <Icon name="folder" size={20} color={theme.colors.primary} />
          <Text 
            variant="bodyMedium" 
            style={[styles.recordName, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {record.name || record.title}
          </Text>
        </View>

        <Divider style={styles.divider} />

        {/* Share Settings */}
        <View style={styles.settingsSection}>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Sharing Settings
          </Text>

          {/* Expiration */}
          <View style={styles.settingItem}>
            <Text variant="bodyMedium" style={[styles.settingLabel, { color: theme.colors.onSurface }]}>
              Link Expiration
            </Text>
            <View style={styles.expirationOptions}>
              {getExpirationOptions().map((option) => (
                <Chip
                  key={option.value}
                  mode={shareSettings.expirationDays === option.value ? 'flat' : 'outlined'}
                  selected={shareSettings.expirationDays === option.value}
                  onPress={() => updateSetting('expirationDays', option.value)}
                  style={styles.expirationChip}
                  compact
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </View>

          {/* Password Protection */}
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <Text variant="bodyMedium" style={[styles.settingLabel, { color: theme.colors.onSurface }]}>
                Password Protection
              </Text>
              <Switch
                value={shareSettings.requirePassword}
                onValueChange={(value) => updateSetting('requirePassword', value)}
              />
            </View>
            
            {shareSettings.requirePassword && (
              <TextInput
                mode="outlined"
                placeholder="Enter password"
                value={shareSettings.password}
                onChangeText={(text) => updateSetting('password', text)}
                secureTextEntry
                style={styles.passwordInput}
              />
            )}
          </View>

          {/* Permissions */}
          <View style={styles.settingItem}>
            <Text variant="bodyMedium" style={[styles.settingLabel, { color: theme.colors.onSurface }]}>
              Permissions
            </Text>
            
            <View style={styles.settingRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Allow Download
              </Text>
              <Switch
                value={shareSettings.allowDownload}
                onValueChange={(value) => updateSetting('allowDownload', value)}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Allow Print
              </Text>
              <Switch
                value={shareSettings.allowPrint}
                onValueChange={(value) => updateSetting('allowPrint', value)}
              />
            </View>
          </View>

          {/* Recipient Info */}
          <View style={styles.settingItem}>
            <Text variant="bodyMedium" style={[styles.settingLabel, { color: theme.colors.onSurface }]}>
              Recipient Information (Optional)
            </Text>
            
            <TextInput
              mode="outlined"
              placeholder="Recipient name"
              value={shareSettings.recipientName}
              onChangeText={(text) => updateSetting('recipientName', text)}
              style={styles.recipientInput}
            />
            
            <TextInput
              mode="outlined"
              placeholder="Recipient email"
              value={shareSettings.recipientEmail}
              onChangeText={(text) => updateSetting('recipientEmail', text)}
              keyboardType="email-address"
              style={styles.recipientInput}
            />
          </View>

          {/* Message */}
          <View style={styles.settingItem}>
            <TextInput
              mode="outlined"
              placeholder="Optional message"
              value={shareSettings.message}
              onChangeText={(text) => updateSetting('message', text)}
              multiline
              numberOfLines={3}
              style={styles.messageInput}
            />
          </View>

          {/* Notifications */}
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <Text variant="bodyMedium" style={[styles.settingLabel, { color: theme.colors.onSurface }]}>
                Notify on Access
              </Text>
              <Switch
                value={shareSettings.notifyOnAccess}
                onValueChange={(value) => updateSetting('notifyOnAccess', value)}
              />
            </View>
          </View>
        </View>

        {/* Generate Button */}
        <Button
          mode="contained"
          onPress={handleGenerateLink}
          loading={isGenerating}
          disabled={isGenerating}
          style={styles.generateButton}
        >
          Generate Sharing Link
        </Button>

        {/* Generated Link */}
        {generatedLink && (
          <View style={styles.generatedLinkSection}>
            <Divider style={styles.divider} />
            
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Generated Link
            </Text>
            
            <View style={[
              styles.linkContainer,
              { backgroundColor: theme.colors.successContainer + '20' }
            ]}>
              <View style={styles.linkHeader}>
                <Icon name="link" size={20} color={theme.colors.success} />
                <Text variant="bodySmall" style={{ color: theme.colors.success, marginLeft: spacing.xs }}>
                  Link created successfully
                </Text>
              </View>
              
              <View style={styles.linkContent}>
                <Text 
                  variant="bodySmall" 
                  style={[styles.linkUrl, { color: theme.colors.onSurface }]}
                  numberOfLines={2}
                  selectable
                >
                  {generatedLink.url}
                </Text>
                
                <View style={styles.linkActions}>
                  <IconButton
                    icon="content-copy"
                    size={20}
                    iconColor={theme.colors.primary}
                    onPress={() => handleCopyLink(generatedLink)}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={() => handleRevokeLink(generatedLink.id)}
                  />
                </View>
              </View>
              
              <View style={styles.linkMeta}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Expires: {formatUtils.formatDate(generatedLink.expiresAt)}
                </Text>
                {generatedLink.accessCount !== undefined && (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Accessed: {generatedLink.accessCount} times
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Existing Links */}
        {existingLinks.length > 0 && (
          <View style={styles.existingLinksSection}>
            <Divider style={styles.divider} />
            
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Existing Links
            </Text>
            
            {existingLinks.map((link) => (
              <View 
                key={link.id} 
                style={[
                  styles.existingLinkItem,
                  { backgroundColor: theme.colors.surfaceVariant + '30' }
                ]}
              >
                <View style={styles.existingLinkHeader}>
                  <Chip
                    mode="outlined"
                    compact
                    style={[
                      styles.linkStatusChip,
                      { borderColor: getLinkStatusColor(link) }
                    ]}
                    textStyle={{ color: getLinkStatusColor(link) }}
                  >
                    {getLinkStatusText(link)}
                  </Chip>
                  
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Created: {formatUtils.formatRelativeTime(link.createdAt)}
                  </Text>
                </View>
                
                <Text 
                  variant="bodySmall" 
                  style={[styles.existingLinkUrl, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {link.url}
                </Text>
                
                <View style={styles.existingLinkActions}>
                  <IconButton
                    icon="content-copy"
                    size={16}
                    iconColor={theme.colors.primary}
                    onPress={() => handleCopyLink(link)}
                    disabled={isLinkExpired(link.expiresAt)}
                  />
                  <IconButton
                    icon="delete"
                    size={16}
                    iconColor={theme.colors.error}
                    onPress={() => handleRevokeLink(link.id)}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
  },
  recordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  recordName: {
    marginLeft: spacing.sm,
    fontWeight: '500',
    flex: 1,
  },
  divider: {
    marginVertical: spacing.md,
  },
  settingsSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  settingItem: {
    marginBottom: spacing.md,
  },
  settingLabel: {
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  expirationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  expirationChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  passwordInput: {
    marginTop: spacing.sm,
  },
  recipientInput: {
    marginBottom: spacing.sm,
  },
  messageInput: {
    marginBottom: spacing.sm,
  },
  generateButton: {
    marginVertical: spacing.md,
  },
  generatedLinkSection: {
    marginTop: spacing.md,
  },
  linkContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  linkUrl: {
    flex: 1,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  linkActions: {
    flexDirection: 'row',
  },
  linkMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  existingLinksSection: {
    marginTop: spacing.md,
  },
  existingLinkItem: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  existingLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  linkStatusChip: {
    height: 20,
  },
  existingLinkUrl: {
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  existingLinkActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ShareLinkGenerator;