
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedProjects() {
  try {
    const projectsData = [
      { name: 'vDSP', type: 'EXTERNAL', start_date: new Date('2024-05-01T00:00:00Z'), target_end_date: new Date('2024-11-30T00:00:00Z') },
      { name: 'RBM', type: 'EXTERNAL', is_opt: true },
      { name: 'Curcool', type: 'INTERNAL' },
      { name: 'HR System', type: 'INTERNAL' },
      { name: 'Activity Tracker (ATM)', type: 'INTERNAL' },
      { name: 'Website Builder', type: 'INTERNAL' },
      { name: 'Accounting', type: 'INTERNAL' },
      { name: 'Ticketing Management', type: 'INTERNAL' },
      { name: 'USSD', type: 'EXTERNAL', start_date: new Date('2022-12-12T00:00:00Z'), target_end_date: new Date('2024-03-17T00:00:00Z') },
      { name: 'LaaS', type: 'EXTERNAL', is_opt: true, start_date: new Date('2024-08-12T00:00:00Z'), target_end_date: new Date('2025-03-31T00:00:00Z')  },
      { name: 'Back Office', type: 'INTERNAL' },
      { name: 'Tesis - operation', type: 'INTERNAL' },
      { name: 'Curcool - operation', type: 'INTERNAL' },
      { name: 'AI Translation', type: 'EXTERNAL', start_date: new Date('2025-02-01T00:00:00Z'), target_end_date: new Date('2025-04-01T00:00:00Z') },
    ];

    for (const projectData of projectsData) {
      const existingProject = await prisma.projects.findUnique({
        where: {
          name: projectData.name,
        },
      });

      if (!existingProject) {
        const project = await prisma.projects.create({
          data: projectData,
        });
        console.log(`Project '${project.name}' seeded successfully.`);
      } else {
        console.log(`Project '${projectData.name}' already exists, skipping...`);
      }
    }
  } catch (error) {
    console.error('Error seeding projects:', error);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = seedProjects;