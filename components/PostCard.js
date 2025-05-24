import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';

const PostCard = () => {
  return (
    <LinearGradient
      colors={Colors.gradientCard} // Using our color scheme
      style={styles.card}
    >
      {/* User Info */}
      <View style={styles.userInfo}>
        <Ionicons name="person-circle" size={24} color={Colors.primary} />
        <Text style={styles.username}>USER 1</Text>
      </View>

      {/* Post Content */}
      <Text style={styles.content}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc maximus, nulla ut commodo sagittis, sapien dui mattis dui, non pulvinar lorem felis nec erat.
      </Text>

      {/* Image Placeholder */}
      <View style={styles.imagePlaceholder}>
        <Ionicons name="image" size={80} color={Colors.textPrimary} />
      </View>

      {/* Footer (Like & Comment Icons) */}
      <View style={styles.footer}>
        <Ionicons name="heart" size={24} color={Colors.primary} />
        <Text style={styles.likeText}>20</Text>
        <Ionicons name="chatbubble" size={24} color={Colors.accentBlue} />
        <Text style={styles.commentText}>20</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 15,
    borderRadius: 10,
    width: 340, // Adjust as needed
    alignSelf: 'center',
    borderColor: Colors.border,
    borderWidth: 1,
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  likeText: {
    color: Colors.textPrimary,
    marginRight: 15,
  },
  commentText: {
    color: Colors.textPrimary,
  },
  username: {
    fontWeight: 'bold',
    marginLeft: 8,
    color: Colors.textPrimary,
  },
  content: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  imagePlaceholder: {
    backgroundColor: Colors.surfaceDark,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
  },
});

export default PostCard;
