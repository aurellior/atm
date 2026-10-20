
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTeams() {
  try {
    const teamsData = [
      { name: 'System Analyst', description: 'Team for system analysts' },
      { name: 'Software Architect', description: 'Team for software architects' },
      { name: 'UI/UX Designer', description: 'Team for UI/UX designers' },
      { name: 'Quality Assurance', description: 'Team for quality assurance testers' },
      { name: 'Business Analyst', description: 'Team for business analysts' },
      { name: 'Developer', description: 'Team for developers' },
      { name: 'Project Manager Officer', description: 'Team for project management office' },
      { name: 'Admin', description: 'Team for admin'},
      { name: 'Chief Operating Officer', description: ''},
      { name: 'Chief Executive Officer', description: ''},
      { name: 'Software Analyst', description: ''},
      { name: 'Research Coordination', description: ''},
      { name: 'Technical Writer', description: ''},
      { name: 'Software Architect', description: ''},
      { name: 'Head of Operation and Delivery', description: ''},
      { name: 'Account Executive', description: ''},
      { name: 'Head Solution and Product', description: ''},
      { name: 'Finance Accounting & Tax Officer', description: ''},
      { name: 'System Engineer', description: ''},
      { name: 'Human Resource Officer', description: ''},
      { name: 'Project Manager', description: ''},
      { name: 'Legal Officer', description: ''},
      { name: 'Social Media Officer', description: ''},
      { name: 'Motion Graphic Designer', description: ''},
      { name: 'Network Engineer', description: ''},
      { name: 'Personal Assistant', description: ''},
      { name: 'Internship', description: ''},
      { name: 'Office Assistant', description: ''},
      { name: 'General Management', description: ''},
    ];

    for (const teamData of teamsData) {
      const existingTeam = await prisma.teams.findUnique({
        where: {
          name: teamData.name,
        },
      });

      if (!existingTeam) {
        const team = await prisma.teams.create({
          data: teamData,
        });
        console.log(`Team '${team.name}' seeded successfully.`);
      } else {
        console.log(`Team '${teamData.name}' already exists, skipping...`);
      }
    }
  } catch (error) {
    console.error('Error seeding teams:', error);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = seedTeams;