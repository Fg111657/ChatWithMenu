const requiredVars = [
  'REACT_APP_SUPABASE_URL',
  'REACT_APP_SUPABASE_ANON_KEY',
];

if (process.env.ALLOW_MISSING_AUTH_ENV === '1') {
  process.exit(0);
}

const missingVars = requiredVars.filter((name) => !process.env[name]);

if (missingVars.length === 0) {
  process.exit(0);
}

console.error('');
console.error('Missing required frontend auth environment variables:');
missingVars.forEach((name) => console.error(`- ${name}`));
console.error('');
console.error('Refusing to build a frontend bundle with login disabled.');
console.error('Set the missing values and run the build again.');
console.error('');
process.exit(1);
