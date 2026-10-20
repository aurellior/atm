const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedActivitiesTypes() {
  try {
    const newActivitiesTypeData = [
      { name: 'Off Plan', description: 'Activities types off plan' },
      { name: 'New Task', description: 'Activities types new task' },
      { name: 'Rebaseline', description: 'Activities types rebaseline' }
    ];

    for (const data of newActivitiesTypeData) {
      const existingActivitiesType = await prisma.activitiesTypes.findUnique({
        where: {
          name: data.name,
        },
      });

      if (!existingActivitiesType) {
        const activitiesTypes = await prisma.activitiesTypes.create({
          data: {
            name: data.name,
            description: data.description,
          },
        });
        console.log(`Activities Types '${activitiesTypes.name}' seeded successfully.`);
      } else {
        console.log(`Activities Types '${data.name}' already exists, skipping...`);
      }
    }
  } catch (error) {
    console.error('Error seeding new activities types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = seedActivitiesTypes;