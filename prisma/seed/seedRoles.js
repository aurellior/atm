const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRoles() {
  try {
    const newRolesData = [
      { name: 'Admin', description: 'Administrator role' },
      { name: 'Employee', description: 'Employee role' },
      { name: 'Lead', description: 'Lead role' },
      { name: 'Management', description: 'Management role for MT and MP' }
    ];

    for (const data of newRolesData) {
      const existingRole = await prisma.roles.findUnique({
        where: {
          name: data.name,
        },
      });

      if (!existingRole) {
        const role = await prisma.roles.create({
          data: {
            name: data.name,
            description: data.description,
          },
        });
        console.log(`Role '${role.name}' seeded successfully.`);
      } else {
        console.log(`Role '${data.name}' already exists, skipping...`);
      }
    }
  } catch (error) {
    console.error('Error seeding new roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = seedRoles;