-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "dailymail" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alwayson" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allmails" (
    "id" SERIAL NOT NULL,
    "mail" TEXT NOT NULL,

    CONSTRAINT "Allmails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extrausermails" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "mail_id" INTEGER NOT NULL,

    CONSTRAINT "Extrausermails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emailwithcode" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Emailwithcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tags" (
    "id" SERIAL NOT NULL,
    "tag_name" TEXT NOT NULL,

    CONSTRAINT "Tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tagstoproblems" (
    "id" SERIAL NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "problem_id" INTEGER NOT NULL,

    CONSTRAINT "Tagstoproblems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problems" (
    "id" SERIAL NOT NULL,
    "problem_link" TEXT NOT NULL,
    "user_id_posted" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'A',
    "title" TEXT NOT NULL,

    CONSTRAINT "Problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usermailprops" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "problemsToMail" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "usermailprops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailproblemTags" (
    "id" SERIAL NOT NULL,
    "mailprop_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "mailproblemTags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problemtouser" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "problem_id" INTEGER NOT NULL,
    "solution" TEXT NOT NULL DEFAULT '',
    "Pattern" TEXT NOT NULL DEFAULT '',
    "mydifficulty" TEXT NOT NULL DEFAULT 'A',
    "best_time" INTEGER NOT NULL DEFAULT 0,
    "no_solved" INTEGER NOT NULL DEFAULT 0,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "importance" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL,

    CONSTRAINT "Problemtouser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemsToUserWithDate" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "problem_id" INTEGER NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemsToUserWithDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comments" (
    "id" SERIAL NOT NULL,
    "comment" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "problem_user_id" INTEGER NOT NULL,

    CONSTRAINT "Comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Extrausermails_user_id_mail_id_key" ON "Extrausermails"("user_id", "mail_id");

-- CreateIndex
CREATE UNIQUE INDEX "Emailwithcode_email_key" ON "Emailwithcode"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tags_tag_name_key" ON "Tags"("tag_name");

-- CreateIndex
CREATE UNIQUE INDEX "Tagstoproblems_tag_id_problem_id_key" ON "Tagstoproblems"("tag_id", "problem_id");

-- CreateIndex
CREATE UNIQUE INDEX "mailproblemTags_mailprop_id_tag_id_key" ON "mailproblemTags"("mailprop_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "Problemtouser_user_id_problem_id_key" ON "Problemtouser"("user_id", "problem_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemsToUserWithDate_user_id_problem_id_key" ON "ProblemsToUserWithDate"("user_id", "problem_id");

-- AddForeignKey
ALTER TABLE "Extrausermails" ADD CONSTRAINT "Extrausermails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Extrausermails" ADD CONSTRAINT "Extrausermails_mail_id_fkey" FOREIGN KEY ("mail_id") REFERENCES "Allmails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagstoproblems" ADD CONSTRAINT "Tagstoproblems_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagstoproblems" ADD CONSTRAINT "Tagstoproblems_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problems" ADD CONSTRAINT "Problems_user_id_posted_fkey" FOREIGN KEY ("user_id_posted") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usermailprops" ADD CONSTRAINT "usermailprops_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailproblemTags" ADD CONSTRAINT "mailproblemTags_mailprop_id_fkey" FOREIGN KEY ("mailprop_id") REFERENCES "usermailprops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailproblemTags" ADD CONSTRAINT "mailproblemTags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problemtouser" ADD CONSTRAINT "Problemtouser_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problemtouser" ADD CONSTRAINT "Problemtouser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemsToUserWithDate" ADD CONSTRAINT "ProblemsToUserWithDate_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemsToUserWithDate" ADD CONSTRAINT "ProblemsToUserWithDate_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comments" ADD CONSTRAINT "Comments_problem_user_id_fkey" FOREIGN KEY ("problem_user_id") REFERENCES "Problemtouser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
