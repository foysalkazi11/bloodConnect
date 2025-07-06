import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Club Details</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.clubId}>Club ID: {id}</Text>
        <Text style={styles.placeholder}>Club details will be displayed here</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  clubId: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 50,
  },
});