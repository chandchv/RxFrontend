import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { 
  Dialog, 
  Portal, 
  Button, 
  Card, 
  Title, 
  Paragraph,
  RadioButton,
  Divider 
} from 'react-native-paper';
import theme from '../../styles/theme';

/**
 * Conflict Resolver Component
 * Handles data conflicts during offline synchronization
 */
const ConflictResolver = ({ 
  visible, 
  onDismiss, 
  conflict, 
  onResolve 
}) => {
  const [selectedResolution, setSelectedResolution] = useState('server');
  const [loading, setLoading] = useState(false);

  if (!conflict) return null;

  const handleResolve = async () => {
    setLoading(true);
    
    try {
      let resolution;
      
      switch (selectedResolution) {
        case 'local':
          resolution = { useLocal: true };
          break;
        case 'server':
          resolution = { useServer: true };
          break;
        case 'merge':
          resolution = { 
            merge: true, 
            mergedData: mergeData(conflict.localData, conflict.serverData) 
          };
          break;
        default:
          resolution = { useServer: true };
      }
      
      await onResolve(resolution);
      onDismiss();
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setLoading(false);
    }
  };

  const mergeData = (localData, serverData) => {
    // Simple merge strategy - can be enhanced based on data type
    return {
      ...serverData,
      ...localData,
      // Keep server timestamps for audit trail
      created_at: serverData.created_at,
      updated_at: new Date().toISOString(),
      // Mark as merged
      _merged: true,
    };
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const renderDataComparison = () => {
    const { localData, serverData } = conflict;
    
    return (
      <View style={styles.comparisonContainer}>
        <View style={styles.dataColumn}>
          <Title style={styles.columnTitle}>Your Changes</Title>
          <Card style={styles.dataCard}>
            <Card.Content>
              {renderDataFields(localData)}
              <Text style={styles.timestamp}>
                Modified: {formatTimestamp(localData?.updated_at)}
              </Text>
            </Card.Content>
          </Card>
        </View>
        
        <View style={styles.dataColumn}>
          <Title style={styles.columnTitle}>Server Version</Title>
          <Card style={styles.dataCard}>
            <Card.Content>
              {renderDataFields(serverData)}
              <Text style={styles.timestamp}>
                Modified: {formatTimestamp(serverData?.updated_at)}
              </Text>
            </Card.Content>
          </Card>
        </View>
      </View>
    );
  };

  const renderDataFields = (data) => {
    if (!data) return <Text>No data available</Text>;
    
    const fieldsToShow = ['title', 'description', 'status', 'notes', 'name'];
    
    return fieldsToShow.map(field => {
      if (data[field] !== undefined) {
        return (
          <View key={field} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field}:</Text>
            <Text style={styles.fieldValue}>{String(data[field])}</Text>
          </View>
        );
      }
      return null;
    }).filter(Boolean);
  };

  return (
    <Portal>
      <Dialog 
        visible={visible} 
        onDismiss={onDismiss}
        style={styles.dialog}
      >
        <Dialog.Title>Data Conflict Detected</Dialog.Title>
        
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Paragraph style={styles.description}>
              The data you modified offline has been changed on the server. 
              Please choose how to resolve this conflict:
            </Paragraph>
            
            {renderDataComparison()}
            
            <Divider style={styles.divider} />
            
            <View style={styles.optionsContainer}>
              <Text style={styles.optionsTitle}>Resolution Options:</Text>
              
              <View style={styles.radioOption}>
                <RadioButton
                  value="local"
                  status={selectedResolution === 'local' ? 'checked' : 'unchecked'}
                  onPress={() => setSelectedResolution('local')}
                />
                <View style={styles.radioContent}>
                  <Text style={styles.radioTitle}>Use My Changes</Text>
                  <Text style={styles.radioDescription}>
                    Keep your offline changes and overwrite the server version
                  </Text>
                </View>
              </View>
              
              <View style={styles.radioOption}>
                <RadioButton
                  value="server"
                  status={selectedResolution === 'server' ? 'checked' : 'unchecked'}
                  onPress={() => setSelectedResolution('server')}
                />
                <View style={styles.radioContent}>
                  <Text style={styles.radioTitle}>Use Server Version</Text>
                  <Text style={styles.radioDescription}>
                    Discard your changes and keep the server version
                  </Text>
                </View>
              </View>
              
              <View style={styles.radioOption}>
                <RadioButton
                  value="merge"
                  status={selectedResolution === 'merge' ? 'checked' : 'unchecked'}
                  onPress={() => setSelectedResolution('merge')}
                />
                <View style={styles.radioContent}>
                  <Text style={styles.radioTitle}>Merge Changes</Text>
                  <Text style={styles.radioDescription}>
                    Combine both versions (your changes take precedence)
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading}>
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleResolve}
            loading={loading}
            disabled={loading}
          >
            Resolve
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  description: {
    marginBottom: 16,
    color: theme.colors.onSurfaceVariant,
  },
  comparisonContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dataColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  columnTitle: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  dataCard: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  fieldContainer: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  fieldValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
  },
  radioContent: {
    flex: 1,
    marginLeft: 8,
  },
  radioTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 16,
  },
});

export default ConflictResolver;