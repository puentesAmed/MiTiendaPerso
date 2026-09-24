process.env.MONGO_URI ||= "mongodb://127.0.0.1/mitiendaperso-test-bootstrap";
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.NODE_ENV ||= "test";
process.env.MANUAL_PAYMENT_BIZUM_RECIPIENT ||= "test-bizum-recipient";
process.env.MANUAL_PAYMENT_BIZUM_INSTRUCTIONS ||=
  "Test Bizum instructions";
process.env.MANUAL_PAYMENT_BANK_ACCOUNT_HOLDER ||= "Test Account Holder";
process.env.MANUAL_PAYMENT_BANK_IBAN ||= "ES00TEST0000000000000000";
process.env.MANUAL_PAYMENT_BANK_INSTRUCTIONS ||=
  "Test bank transfer instructions";
