import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

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

  // Create personal budget
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
      amount: 2000,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      budgetType: 'personal',
    },
  });

  console.log(`✅ Created personal budget: $${personalBudget.amount}`);

  // Create family budget
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
      amount: 5000,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      budgetType: 'family',
    },
  });

  console.log(`✅ Created family budget: $${familyBudget.amount}`);

  // Create sample personal expenses
  const expenses = [
    {
      userId: user.id,
      amount: 45.5,
      category: 'Food',
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      note: 'Grocery shopping',
      budgetType: 'personal',
    },
    {
      userId: user.id,
      amount: 120,
      category: 'Transport',
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      note: 'Gas',
      budgetType: 'personal',
    },
    {
      userId: user.id,
      amount: 80,
      category: 'Entertainment',
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      note: 'Movie tickets',
      budgetType: 'personal',
    },
    {
      userId: user.id,
      amount: 150,
      category: 'Utilities',
      date: new Date(now.getFullYear(), now.getMonth(), 15),
      note: 'Electric bill',
      budgetType: 'personal',
    },
    // Family expenses
    {
      userId: user.id,
      amount: 500,
      category: 'Food',
      date: new Date(now.getFullYear(), now.getMonth(), 3),
      note: 'Family dinner',
      budgetType: 'family',
    },
    {
      userId: user.id,
      amount: 200,
      category: 'Entertainment',
      date: new Date(now.getFullYear(), now.getMonth(), 8),
      note: 'Theme park visit',
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

