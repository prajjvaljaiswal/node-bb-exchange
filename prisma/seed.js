require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding dev database...');

  const BCRYPT_ROUNDS = 4;

  // Platform admin
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || 'admin@bloodexchange.in';
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123456';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, BCRYPT_ROUNDS),
        role: 'PLATFORM_ADMIN',
        isEmailVerified: true,
        isActive: true,
      },
    });
    console.log(`✅ Platform admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`ℹ️  Platform admin already exists: ${adminEmail}`);
  }

  // Test blood bank
  const bankEmail = 'aiims@bloodexchange.in';
  const existingBank = await prisma.bloodBank.findUnique({ where: { email: bankEmail } }).catch(() => null);
  if (!existingBank) {
    const bankUser = await prisma.user.upsert({
      where: { email: 'bbadmin@bloodexchange.in' },
      update: {},
      create: {
        email: 'bbadmin@bloodexchange.in',
        passwordHash: await bcrypt.hash('BBAdmin@123', BCRYPT_ROUNDS),
        role: 'BLOOD_BANK_ADMIN',
        isEmailVerified: true,
        isActive: true,
      },
    });

    const bank = await prisma.bloodBank.create({
      data: {
        name: 'AIIMS Blood Bank (Dev)',
        registrationNo: 'DEV-BB-001',
        registrationValidUpto: new Date('2030-12-31'),
        address: '1, Ansari Nagar East, New Delhi',
        city: 'New Delhi',
        district: 'South Delhi',
        state: 'Delhi',
        pincode: '110029',
        contactMobile: '9999999999',
        email: bankEmail,
        isActive: true,
        approvedBy: 'SEED',
        approvedAt: new Date(),
      },
    });

    await prisma.bloodBankAdmin.create({
      data: {
        userId: bankUser.id,
        bloodBankId: bank.id,
        name: 'Dr. Dev Admin',
        designation: 'Medical Director',
        mobile: '9999999999',
        isPrimary: true,
        authStatus: 'ACTIVE',
      },
    });

    console.log(`✅ Test blood bank created: ${bankEmail}`);
    console.log(`   Admin login: bbadmin@bloodexchange.in / BBAdmin@123`);
  } else {
    console.log(`ℹ️  Test blood bank already exists`);
  }

  // Test donor
  const donorEmail = 'donor@bloodexchange.in';
  const existingDonor = await prisma.user.findUnique({ where: { email: donorEmail } });
  if (!existingDonor) {
    const donorUser = await prisma.user.create({
      data: {
        email: donorEmail,
        passwordHash: await bcrypt.hash('Donor@123456', BCRYPT_ROUNDS),
        role: 'DONOR',
        isEmailVerified: true,
        isActive: true,
      },
    });
    await prisma.donor.create({
      data: {
        userId: donorUser.id,
        name: 'Rahul Sharma (Dev)',
        age: 28,
        sex: 'Male',
        mobile: '9876543210',
        email: donorEmail,
        weight: 72,
        bloodGroup: 'O+',
        address: '42, Test Colony, New Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
    });
    console.log(`✅ Test donor created: ${donorEmail} / Donor@123456`);
  } else {
    console.log(`ℹ️  Test donor already exists`);
  }

  // Test patient
  const patientEmail = 'patient@bloodexchange.in';
  const existingPatient = await prisma.user.findUnique({ where: { email: patientEmail } });
  if (!existingPatient) {
    const patientUser = await prisma.user.create({
      data: {
        email: patientEmail,
        passwordHash: await bcrypt.hash('Patient@123', BCRYPT_ROUNDS),
        role: 'PATIENT',
        isEmailVerified: true,
        isActive: true,
      },
    });
    await prisma.patient.create({
      data: {
        userId: patientUser.id,
        patientDisplayId: `PAT-DEV-${Date.now()}`,
        name: 'Priya Singh (Dev)',
        age: 35,
        sex: 'Female',
        bloodGroup: 'O+',
        unitsRequired: 2,
        hospitalName: 'AIIMS New Delhi',
        doctorName: 'Dr. Ramesh Kumar',
        disease: 'Thalassemia',
        mobile: '9876500000',
        email: patientEmail,
        registrationFeePaid: true,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Test patient created: ${patientEmail} / Patient@123`);
  } else {
    console.log(`ℹ️  Test patient already exists`);
  }

  console.log('\n🎉 Seed complete! Dev credentials:');
  console.log('   Platform Admin : admin@bloodexchange.in / Admin@123456');
  console.log('   Blood Bank Admin: bbadmin@bloodexchange.in / BBAdmin@123');
  console.log('   Donor          : donor@bloodexchange.in / Donor@123456');
  console.log('   Patient        : patient@bloodexchange.in / Patient@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
