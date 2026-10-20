const { PrismaClient } = require('@prisma/client');
const seedRoles = require('./seedRoles');
const seedTeams = require('./seedTeams');
const seedProjects = require('./seedProjects');
const seedAdmin = require('./seedAdmin');
const seedActivitiesTypes = require('./seedActivitiesType');


const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Seeding roles...');
    await seedRoles();

    console.log('Seeding teams...');
    await seedTeams();

    console.log('Seeding projects...');
    await seedProjects();
    
    console.log('Seeding Admin...');
    await seedAdmin();

    console.log('Seeding Activities Types...');
    await seedActivitiesTypes();

  } catch (error) {
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();