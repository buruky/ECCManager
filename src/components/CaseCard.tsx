import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Case } from '@/types';
import { COLORS, PROGRAM_LABELS } from '@/utils/constants';

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
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
  showProgram?: boolean;
}

export default function CaseCard({ item, onPress, showProgram = true }: Props) {
  const isAssigned = !!item.assignedCaseManagerId;
  const accentColor = isAssigned ? COLORS.success : COLORS.warning;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: accentColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>{item.clientName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status] ?? item.status}
          </Text>
        </View>
      </View>

      {showProgram && item.program && (
        <Text style={styles.program}>{PROGRAM_LABELS[item.program]}</Text>
      )}

      <View style={styles.assignmentRow}>
        {isAssigned ? (
          <>
            <Ionicons name="person-circle-outline" size={15} color={COLORS.success} />
            <Text style={styles.assignedText}>{item.assignedCaseManagerName}</Text>
          </>
        ) : (
          <>
            <Ionicons name="alert-circle-outline" size={15} color={COLORS.warning} />
            <Text style={styles.unassignedText}>Needs Assignment</Text>
          </>
        )}
      </View>

      <Text style={styles.date}>
        {item.intakeDate ? `Intake: ${item.intakeDate}` : `Created ${new Date(item.createdAt).toLocaleDateString()}`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  program: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  assignedText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  unassignedText: {
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});