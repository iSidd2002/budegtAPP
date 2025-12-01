const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const hashedPassword = await bcryptjs.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: hashedPassword,
    },
  });

  console.log(`✅ Created user: ${user.email}`);

  // Create personal budget (₹50,000 monthly budget)
  const now = new Date();
  const personalBudget = await prisma.budget.upsert({
    where: {
      userId_month_year_budgetType: {
        userId: user.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        budgetType: 'personal',
      },
    },
    update: {},
    create: {
      userId: user.id,
      amount: 50000,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      budgetType: 'personal',
    },
  });

  console.log(`✅ Created personal budget: ₹${personalBudget.amount.toLocaleString('en-IN')}`);

  // Create family budget (₹100,000 monthly budget)
  const familyBudget = await prisma.budget.upsert({
    where: {
      userId_month_year_budgetType: {
        userId: user.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        budgetType: 'family',
      },
    },
    update: {},
    create: {
      userId: user.id,
      amount: 100000,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      budgetType: 'family',
    },
  });

  console.log(`✅ Created family budget: ₹${familyBudget.amount.toLocaleString('en-IN')}`);

  // Create sample expenses (in INR)
  const expenses = [
    // Personal expenses
    {
      userId: user.id,
      amount: 1250.50,
      category: 'Food',
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      note: 'Grocery shopping',
      budgetType: 'personal',
    },
    {
      userId: user.id,
      amount: 3500,
      category: 'Transport',
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      note: 'Fuel and maintenance',
      budgetType: 'personal',
    },
    {
      userId: user.id,
      amount: 2000,
      category: 'Entertainment',
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      note: 'Movie and dinner',
      budgetType: 'personal',
    },
    {
      userId: user.id,
      amount: 4500,
      category: 'Utilities',
      date: new Date(now.getFullYear(), now.getMonth(), 15),
      note: 'Electricity and water bill',
      budgetType: 'personal',
    },
    // Family expenses
    {
      userId: user.id,
      amount: 15000,
      category: 'Food',
      date: new Date(now.getFullYear(), now.getMonth(), 3),
      note: 'Family grocery shopping',
      budgetType: 'family',
    },
    {
      userId: user.id,
      amount: 8000,
      category: 'Entertainment',
      date: new Date(now.getFullYear(), now.getMonth(), 8),
      note: 'Family outing',
      budgetType: 'family',
    },
    {
      userId: user.id,
      amount: 12000,
      category: 'Utilities',
      date: new Date(now.getFullYear(), now.getMonth(), 12),
      note: 'Home maintenance',
      budgetType: 'family',
    },
  ];

  for (const expense of expenses) {
    await prisma.expense.create({ data: expense });
  }

  console.log(`✅ Created ${expenses.length} sample expenses`);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

