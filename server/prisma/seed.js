const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database reference tables...');

  // 2. Account Types
  const accountTypes = [
    { code: 'CASH', label: 'Cash', icon: '💵', sortOrder: 0 },
    { code: 'BANK', label: 'Bank Account', icon: '🏦', sortOrder: 1 },
    { code: 'CREDIT', label: 'Credit Card', icon: '💳', sortOrder: 2 },
    { code: 'SAVINGS', label: 'Savings Account', icon: '🏧', sortOrder: 3 },
    { code: 'E_WALLET', label: 'E-Wallet', icon: '📱', sortOrder: 4 }
  ];

  for (const item of accountTypes) {
    await prisma.refAccountType.upsert({
      where: { code: item.code },
      update: {},
      create: item
    });
  }
  console.log('✅ Seeded Account Types');

  // 3. Income Categories
  const incomeCategories = [
    { name: 'Salary', description: 'Monthly or bi-weekly employment salary' },
    { name: 'Business', description: 'Revenue from business operations' },
    { name: 'Investment', description: 'Dividends, stock returns, or interest income' },
    { name: 'Freelance', description: 'Gigs, consulting work, or side projects' },
    { name: 'Gifts/Others', description: 'Monetary gifts or miscellaneous sources' }
  ];

  for (const item of incomeCategories) {
    await prisma.refIncomeCategory.upsert({
      where: { name: item.name },
      update: {},
      create: item
    });
  }
  console.log('✅ Seeded Income Categories');

  // 4. Expense Categories
  const expenseCategories = [
    { name: 'Food & Dining', description: 'Groceries, restaurants, fast food, and snacks' },
    { name: 'Housing & Rent', description: 'Rent, mortgage, home maintenance, or repairs' },
    { name: 'Utilities', description: 'Electricity, water, gas, internet, phone bill' },
    { name: 'Transportation', description: 'Fuel, vehicle maintenance, taxi, train/bus fare' },
    { name: 'Health & Medical', description: 'Doctor visits, medicine, insurance premiums, dental' },
    { name: 'Entertainment & Leisure', description: 'Movies, streaming services, concerts, hobbies' },
    { name: 'Shopping', description: 'Clothes, electronics, personal care items, gifts' },
    { name: 'Education', description: 'Tuition fees, books, courses, school supplies' },
    { name: 'Insurance', description: 'Life, health, car, or home insurance' },
    { name: 'Transfer Fee', description: 'Fees associated with internal transfers or savings deposits' },
    { name: 'Miscellaneous', description: 'Any other miscellaneous expenses' }
  ];

  for (const item of expenseCategories) {
    await prisma.refExpenseCategory.upsert({
      where: { name: item.name },
      update: {},
      create: item
    });
  }
  console.log('✅ Seeded Expense Categories');

  // 5. Saving Categories
  const savingCategories = [
    { name: 'Retirement', description: 'Long-term savings for retirement' },
    { name: 'Emergency Fund', description: '3-6 months of living expenses for emergencies' },
    { name: 'Investments', description: 'Allocations for stocks, mutual funds, or real estate' },
    { name: 'Travel & Leisure', description: 'Savings for vacations, flights, hotels' },
    { name: 'General Savings', description: 'General or unallocated savings' }
  ];

  for (const item of savingCategories) {
    await prisma.refSavingCategory.upsert({
      where: { name: item.name },
      update: {},
      create: item
    });
  }
  console.log('✅ Seeded Saving Categories');

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
