import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Case } from '@/types';
import { COLORS, PROGRAM_LABELS } from '@/utils/constants';

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.pending,
  active: COLORS.success,
  onHold: COLORS.textSecondary,
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  active: 'Active',
  onHold: 'On Hold',
};

interface Props {
  item: Case;
  onPress: () => void;
}

export default function CaseCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <Text style={styles.name}>{item.clientName}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>
      {item.program && (
        <Text style={styles.program}>{PROGRAM_LABELS[item.program]}</Text>
      )}
      {item.assignedCaseManagerName ? (
        <Text style={styles.sub}>Case Manager: {item.assignedCaseManagerName}</Text>
      ) : (
        <Text style={[styles.sub, { color: COLORS.warning }]}>Unassigned</Text>
      )}
      <Text style={styles.date}>Created {new Date(item.createdAt).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  program: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
