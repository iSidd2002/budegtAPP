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

  // Create budget (₹50,000 monthly budget)
  const now = new Date();
  const budget = await prisma.budget.upsert({
    where: {
      userId_month_year: {
        userId: user.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
    },
    update: {},
    create: {
      userId: user.id,
      amount: 50000,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
  });

  console.log(`✅ Created budget: ₹${budget.amount.toLocaleString('en-IN')}`);

  // Create sample expenses (in INR)
  const expenses = [
    {
      userId: user.id,
      amount: 1250.50,
      category: 'Food',
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      note: 'Grocery shopping',
    },
    {
      userId: user.id,
      amount: 3500,
      category: 'Transport',
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      note: 'Fuel and maintenance',
    },
    {
      userId: user.id,
      amount: 2000,
      category: 'Entertainment',
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      note: 'Movie and dinner',
    },
    {
      userId: user.id,
      amount: 4500,
      category: 'Utilities',
      date: new Date(now.getFullYear(), now.getMonth(), 15),
      note: 'Electricity and water bill',
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

