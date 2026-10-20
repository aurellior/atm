const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const hashPassword = (pw) => bcrypt.hashSync(pw, 10);
const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    const adminRole = await prisma.roles.findUnique({
      where: { name: 'Admin' },
    });

    if (!adminRole) {
      throw new Error("Admin role not found. Ensure roles are seeded first.");
    }

    const adminTeam = await prisma.teams.findUnique({
        where: { name: 'Admin' }
    });

    if (!adminTeam) {
        throw new Error("Admin team not found. Ensure roles are seeded first.");
      }

    const employeesData = [
      {
        role_id: adminRole.id,
        team_id: adminTeam.id, 
        name: 'Admin',
        email: 'admin@mail.com',
        password: 'admin123',
        verifiedAt: new Date()
      },
    ];

    for (const employeeData of employeesData) {
      const existingEmployee = await prisma.employees.findUnique({
        where: { email: employeeData.email },
      });

      if (!existingEmployee) {

        const hashedPassword = await hashPassword(employeeData.password, 10);

        const employee = await prisma.employees.create({
          data: {
            ...employeeData,
            password: hashedPassword,
          }
        });
        console.log(`Employee '${employee.name}' with role 'Admin' seeded successfully.`);
      } else {
        console.log(`Employee with email '${employeeData.email}' already exists, skipping...`);
      }
    }
  } catch (error) {
    console.error('Error seeding employees:', error);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = seedAdmin;
