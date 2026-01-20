import bcrypt from 'bcryptjs';

// New password you want to set
const newPassword = 'YourNewPassword123!';

// Generate hash
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(newPassword, salt);

console.log('\nUpdate your password in Supabase with this hash:');
console.log(hashedPassword);
console.log('\nRun this SQL in Supabase SQL Editor:');
console.log(`UPDATE users SET password_hash = '${hashedPassword}' WHERE email = 'christopher1collin@gmail.com';`);
