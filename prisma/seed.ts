import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("demo1234", 12);

  const teacher = await prisma.teacher.upsert({
    where: { email: "teacher@demo.com" },
    update: {},
    create: {
      authId: "seed-teacher-auth-id",
      email: "teacher@demo.com",
      name: "Demo Teacher",
    },
  });

  const test = await prisma.test.upsert({
    where: { id: "seed-test-math-quiz" },
    update: {},
    create: {
      id: "seed-test-math-quiz",
      teacherId: teacher.id,
      title: "Mathematics Mid-Term Quiz",
      className: "Grade 10-A",
      subject: "Mathematics",
      instructions:
        "Read each question carefully. You may skip questions and return to them if allowed. Good luck!",
      totalDurationMinutes: 30,
      approvalPasswordHash: passwordHash,
      timerMode: "SAME_FOR_ALL",
      defaultQuestionSeconds: 90,
      allowSkip: true,
      allowReturnToSkipped: true,
      allowRetake: false,
      disableCopyPaste: false,
      requireFullscreen: false,
      status: "ACTIVE",
      published: true,
    },
  });

  await prisma.questionOption.deleteMany({
    where: { question: { testId: test.id } },
  });
  await prisma.studentAnswer.deleteMany({
    where: { attempt: { testId: test.id } },
  });
  await prisma.studentAttempt.deleteMany({ where: { testId: test.id } });
  await prisma.question.deleteMany({ where: { testId: test.id } });

  const q1 = await prisma.question.create({
    data: {
      testId: test.id,
      type: "MCQ",
      text: "What is the value of 2 + 2?",
      marks: 2,
      orderIndex: 0,
      explanation: "Basic addition: 2 + 2 = 4",
      options: {
        create: [
          { text: "3", isCorrect: false, orderIndex: 0 },
          { text: "4", isCorrect: true, orderIndex: 1 },
          { text: "5", isCorrect: false, orderIndex: 2 },
          { text: "22", isCorrect: false, orderIndex: 3 },
        ],
      },
    },
    include: { options: true },
  });

  await prisma.question.create({
    data: {
      testId: test.id,
      type: "MCQ",
      text: "Which of the following is a prime number?",
      marks: 2,
      orderIndex: 1,
      explanation: "17 is only divisible by 1 and itself.",
      options: {
        create: [
          { text: "15", isCorrect: false, orderIndex: 0 },
          { text: "17", isCorrect: true, orderIndex: 1 },
          { text: "21", isCorrect: false, orderIndex: 2 },
          { text: "25", isCorrect: false, orderIndex: 3 },
        ],
      },
    },
  });

  await prisma.question.create({
    data: {
      testId: test.id,
      type: "SHORT",
      text: "What is the square root of 144?",
      marks: 3,
      orderIndex: 2,
      shortAnswer: "12",
    },
  });

  await prisma.question.create({
    data: {
      testId: test.id,
      type: "LONG",
      text: "Explain the Pythagorean theorem and provide an example.",
      marks: 5,
      orderIndex: 3,
    },
  });

  const attempt = await prisma.studentAttempt.create({
    data: {
      testId: test.id,
      fullName: "Alice Johnson",
      className: "Grade 10-A",
      rollNumber: "101",
      email: "alice@student.com",
      status: "SUBMITTED",
      submittedAt: new Date(),
      maxScore: 12,
      totalScore: 4,
      tabSwitchCount: 1,
    },
  });

  const correctOption = q1.options.find((o) => o.isCorrect)!;
  await prisma.studentAnswer.create({
    data: {
      attemptId: attempt.id,
      questionId: q1.id,
      selectedOptionId: correctOption.id,
      marksAwarded: 2,
      gradingStatus: "AUTO_GRADED",
    },
  });

  console.log("Seed complete!");
  console.log("");
  console.log("Demo test URL: http://localhost:3000/test/seed-test-math-quiz");
  console.log("Approval password: demo1234");
  console.log("");
  console.log("Note: Create a Supabase account with email teacher@demo.com to login as teacher,");
  console.log("or sign up with any email — a teacher profile is auto-created on first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
