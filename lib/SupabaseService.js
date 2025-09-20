import { createClient } from '@supabase/supabase-js';

// ================================
// SUPABASE CONFIGURATION - FIXED VERSION
// ================================
const SUPABASE_URL = 'https://fszapcjjkscptztzyxwt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzemFwY2pqa3NjcHR6dHp5eHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTM5MTYsImV4cCI6MjA3Mzc2OTkxNn0.M_C5ZcFm6njmu3rSuzfzYQUP7UHDXSwHUWqo5kbf56U';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================
// AUTHENTICATION
// ================================
export const auth = {
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  signUp: async (email, password, userData = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      console.log('Supabase signUp response:', { data, error });
      
      if (error) {
        console.error('Supabase signUp error:', error);
        throw error;
      }
      
      return { data, error };
    } catch (err) {
      console.error('SignUp method error:', err);
      throw err;
    }
  },

  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      return { data, error };
    } catch (err) {
      console.error('SignIn method error:', err);
      return { data: null, error: err };
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ================================
// USER PROFILES
// ================================
export const userProfiles = {
  ensureProfile: async (userId, profileData = {}) => {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existing && !fetchError) {
        return existing;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          name: profileData.name || 'User',
          status: 'online',
          avatar: null,
          last_seen: new Date().toISOString(),
          ...profileData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error ensuring profile:', error);
      throw error;
    }
  },

  getProfileByUserId: async (userId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting profile:', error);
      return {
        user_id: userId,
        name: 'Unknown User',
        status: 'offline',
        avatar: null,
        last_seen: new Date().toISOString()
      };
    }

    return data || {
      user_id: userId,
      name: 'Unknown User',
      status: 'offline',
      avatar: null,
      last_seen: new Date().toISOString()
    };
  },

  updateProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        last_seen: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateStatus: async (userId, status) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        status,
        last_seen: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// ================================
// POSTS
// ================================
export const posts = {
  createPost: async (userId, content, imageUrl = null) => {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content,
        image_url: imageUrl,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getPostsWithUsers: async () => {
    try {
      console.log('Attempting to fetch posts with automatic joins...');
      
      try {
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            user_profiles!posts_user_id_fkey (
              user_id,
              name,
              avatar
            )
          `)
          .order('created_at', { ascending: false });

        if (!postsError && postsData) {
          console.log('Automatic join successful! Posts fetched:', postsData.length);
          
          const postsWithCounts = await Promise.all(
            postsData.map(async (post) => {
              const { count: likeCount } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

              const { count: commentCount } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

              return {
                ...post,
                likes: { count: likeCount || 0 },
                comments: { count: commentCount || 0 }
              };
            })
          );

          return postsWithCounts;
        }
      } catch (autoJoinError) {
        console.warn('Automatic join failed, falling back to manual join:', autoJoinError);
      }

      console.log('Using manual join approach...');
      
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        throw postsError;
      }

      console.log('Posts fetched:', postsData?.length || 0);

      if (!postsData || postsData.length === 0) {
        return [];
      }

      const userIds = [...new Set(postsData.map(post => post.user_id))];
      console.log('Unique user IDs:', userIds);

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError);
      }

      console.log('Profiles fetched:', profiles?.length || 0);

      const profileMap = {};
      if (profiles) {
        profiles.forEach(profile => {
          profileMap[profile.user_id] = profile;
        });
      }

      const postsWithUsers = await Promise.all(
        postsData.map(async (post) => {
          const userProfile = profileMap[post.user_id] || {
            user_id: post.user_id,
            name: 'Unknown User',
            avatar: null
          };

          const { count: likeCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            user_profiles: userProfile,
            likes: { count: likeCount || 0 },
            comments: { count: commentCount || 0 }
          };
        })
      );

      console.log('Posts with users prepared:', postsWithUsers.length);
      return postsWithUsers;

    } catch (error) {
      console.error('Error in getPostsWithUsers:', error);
      throw error;
    }
  },

  getPostById: async (postId) => {
    try {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', post.user_id)
        .single();

      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      const commentUserIds = comments ? [...new Set(comments.map(c => c.user_id))] : [];
      const { data: commentProfiles } = commentUserIds.length > 0 
        ? await supabase
            .from('user_profiles')
            .select('*')
            .in('user_id', commentUserIds)
        : { data: [] };

      const commentProfileMap = {};
      if (commentProfiles) {
        commentProfiles.forEach(profile => {
          commentProfileMap[profile.user_id] = profile;
        });
      }

      const commentsWithProfiles = comments ? comments.map(comment => ({
        ...comment,
        user_profiles: commentProfileMap[comment.user_id] || {
          user_id: comment.user_id,
          name: 'Unknown User',
          avatar: null
        }
      })) : [];

      const { count: likeCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      return {
        ...post,
        user_profiles: userProfile || {
          user_id: post.user_id,
          name: 'Unknown User',
          avatar: null
        },
        comments: commentsWithProfiles,
        likeCount: likeCount || 0
      };
    } catch (error) {
      console.error('Error getting post by ID:', error);
      throw error;
    }
  }
};

// ================================
// LIKES
// ================================
export const likes = {
  toggleLike: async (postId, userId) => {
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: userId
        });

      if (error) throw error;
    }

    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    return count;
  },

  checkUserLike: async (postId, userId) => {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    return !!data && !error;
  },

  getLikeCount: async (postId) => {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) return 0;
    return count;
  }
};

// ================================
// COMMENTS
// ================================
export const comments = {
  addComment: async (postId, userId, content) => {
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (commentError) throw commentError;

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      ...comment,
      user_profiles: userProfile || {
        user_id: userId,
        name: 'Unknown User',
        avatar: null
      }
    };
  },

  getCommentsCount: async (postId) => {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) return 0;
    return count;
  }
};

// ================================
// FIXED FILE STORAGE
// ================================
export const storage = {
  // Check if bucket exists (don't create programmatically due to RLS)
  checkBucket: async (bucketName = 'images') => {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return false;
      }
      
      const bucket = buckets?.find(b => b.name === bucketName);
      
      if (!bucket) {
        console.error(`❌ Bucket '${bucketName}' not found. Please create it manually in Supabase dashboard.`);
        return false;
      }
      
      console.log(`✅ ${bucketName} bucket exists`);
      return true;
    } catch (error) {
      console.error('Error checking bucket:', error);
      return false;
    }
  },

  // FIXED upload function - no longer tries to create bucket
  uploadImage: async (file, bucket = 'images') => {
    try {
      console.log('Starting upload for file:', file.fileName || 'unnamed');
      
      // Check if bucket exists (don't try to create it)
      const bucketExists = await storage.checkBucket(bucket);
      if (!bucketExists) {
        throw new Error(`Storage bucket '${bucket}' not found. Please create it manually in your Supabase dashboard.`);
      }
      
      // Generate unique filename
      const fileExt = file.uri.split('.').pop().toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      console.log('Uploading to path:', filePath);
      
      // Convert file URI to blob
      const response = await fetch(file.uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URI: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Blob created, size:', blob.size, 'type:', blob.type);
      
      // Upload with proper error handling
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: file.mimeType || blob.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('Upload error:', error);
        
        // Handle specific error types
        if (error.message?.includes('row level security')) {
          throw new Error('Storage permission error. Please check your Supabase storage policies.');
        } else if (error.message?.includes('payload too large')) {
          throw new Error('File too large. Please select a smaller image (max 5MB).');
        } else if (error.message?.includes('Network request failed')) {
          throw new Error('Network error. Please check your internet connection.');
        }
        
        throw error;
      }
      
      console.log('Upload successful:', data);
      
      // Get public URL - FIXED to avoid double URLs
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      console.log('Public URL generated:', urlData.publicUrl);
      
      return {
        fileId: data.path,
        publicUrl: urlData.publicUrl,
        fileName: fileName,
        path: filePath
      };
    } catch (error) {
      console.error('Upload error details:', error);
      throw error;
    }
  },

  // FIXED getPublicUrl function to avoid double URLs
  getPublicUrl: (bucket, filePath) => {
    // If filePath is already a full URL, return it as-is
    if (typeof filePath === 'string' && filePath.startsWith('http')) {
      return filePath;
    }
    
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  deleteFile: async (bucket, fileName) => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) throw error;
    return true;
  }
};

// ================================
// CONVERSATIONS & MESSAGES
// ================================
export const conversations = {
  getUserConversations: async (userId) => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          content,
          created_at
        )
      `)
      .or(`participant1.eq.${userId},participant2.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  createConversation: async (participant1, participant2) => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant1,
        participant2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const messages = {
  sendMessage: async (conversationId, senderId, content) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getMessages: async (conversationId) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user_profiles (
          name,
          avatar
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }
};

// ================================
// REAL-TIME SUBSCRIPTIONS
// ================================
export const realtime = {
  subscribe: (table, callback) => {
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table 
        }, 
        callback
      )
      .subscribe();
  },

  subscribeToPosts: (callback) => {
    return supabase
      .channel('posts_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'posts' 
        }, 
        callback
      )
      .subscribe();
  },

  subscribeToMessages: (conversationId, callback) => {
    return supabase
      .channel(`messages_${conversationId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        callback
      )
      .subscribe();
  },

  unsubscribe: (subscription) => {
    return supabase.removeChannel(subscription);
  }
};

// ================================
// UTILITY FUNCTIONS - FIXED
// ================================
export const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

// FIXED helper for avatar URLs - prevents double URL generation
export const getProfileImageUrl = (avatarPath) => {
  if (!avatarPath) return null;
  
  // If it's already a full URL, return as-is
  if (typeof avatarPath === 'string' && avatarPath.startsWith('http')) {
    return avatarPath;
  }
  
  // Otherwise, generate the public URL
  return storage.getPublicUrl('images', avatarPath);
};

// Export the main client for direct access if needed
export { supabase };

// ================================
// MANUAL SETUP INSTRUCTIONS - UPDATED
// ================================
export const setupInstructions = () => {
  console.log('=== SUPABASE SETUP INSTRUCTIONS ===');
  console.log('');
  console.log('1. CREATE STORAGE BUCKET:');
  console.log('   - Go to Supabase Dashboard → Storage');
  console.log('   - Click "New bucket"');
  console.log('   - Name: images');
  console.log('   - Public bucket: ✓ (checked)');
  console.log('   - File size limit: 5MB');
  console.log('');
  console.log('2. RUN THESE SQL COMMANDS:');
  console.log('   Go to Supabase Dashboard → SQL Editor → New query');
  console.log('   Copy and paste this SQL:');
  console.log('');
  console.log(`
-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'images');

-- Allow authenticated upload  
CREATE POLICY "Authenticated upload" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');

-- Allow users to update their files
CREATE POLICY "User update own files" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'images');

-- Allow users to delete their files
CREATE POLICY "User delete own files" ON storage.objects  
FOR DELETE TO authenticated USING (bucket_id = 'images');
  `);
  console.log('');
  console.log('3. VERIFY SETUP:');
  console.log('   Run testConnection() after completing steps 1-2');
};

// ================================
// CONNECTION TEST - UPDATED
// ================================
export const testConnection = async () => {
  try {
    console.log('=== TESTING SUPABASE CONNECTION ===');
    
    // Test auth
    const { data: { user } } = await supabase.auth.getUser();
    console.log('✅ Auth connection works, user:', user?.email || 'No user');
    
    // Test database
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
      
    if (error && error.code !== '42P01') {
      console.log('❌ Database test failed:', error.message);
    } else {
      console.log('✅ Database connection works');
    }
    
    // Test storage
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      console.log('❌ Storage test failed:', storageError.message);
      console.log('Run setupStoragePolicies() to fix storage permissions');
    } else {
      console.log('✅ Storage connection works, buckets:', buckets.length);
    }
    
    console.log('🎉 Supabase setup test complete!');
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
};