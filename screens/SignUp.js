import bcrypt from 'bcryptjs';

const handleSignUp = async () => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

    await databases.createDocument(
      '67cf7c320035a1dd0e62', // Database ID
      '67cf7ceb002ef53618ef', // Collection ID
      'unique()', // Document ID (auto-generated)
      {
        name: name,
        email: email,
        password: hashedPassword, // Store the hashed password
        createdAt: new Date().toISOString(),
      }
    );

    Alert.alert("Success", "Account created successfully!");
  } catch (error) {
    Alert.alert("Error", error.message);
  }
};