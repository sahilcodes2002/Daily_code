-- DropForeignKey
ALTER TABLE "Tagstoproblems" DROP CONSTRAINT "Tagstoproblems_problem_id_fkey";

-- DropForeignKey
ALTER TABLE "Tagstoproblems" DROP CONSTRAINT "Tagstoproblems_tag_id_fkey";

-- CreateIndex
CREATE INDEX "Comments_problem_user_id_idx" ON "Comments"("problem_user_id");

-- CreateIndex
CREATE INDEX "Extrausermails_user_id_idx" ON "Extrausermails"("user_id");

-- CreateIndex
CREATE INDEX "Problems_difficulty_idx" ON "Problems"("difficulty");

-- CreateIndex
CREATE INDEX "Problems_user_id_posted_idx" ON "Problems"("user_id_posted");

-- CreateIndex
CREATE INDEX "Problems_title_idx" ON "Problems"("title");

-- CreateIndex
CREATE INDEX "ProblemsToUserWithDate_user_id_idx" ON "ProblemsToUserWithDate"("user_id");

-- CreateIndex
CREATE INDEX "ProblemsToUserWithDate_user_id_solved_idx" ON "ProblemsToUserWithDate"("user_id", "solved");

-- CreateIndex
CREATE INDEX "ProblemsToUserWithDate_user_id_created_at_idx" ON "ProblemsToUserWithDate"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ProblemsToUserWithDate_user_id_solved_created_at_idx" ON "ProblemsToUserWithDate"("user_id", "solved", "created_at");

-- CreateIndex
CREATE INDEX "Problemtouser_user_id_idx" ON "Problemtouser"("user_id");

-- CreateIndex
CREATE INDEX "Problemtouser_user_id_starred_idx" ON "Problemtouser"("user_id", "starred");

-- CreateIndex
CREATE INDEX "Problemtouser_user_id_importance_idx" ON "Problemtouser"("user_id", "importance");

-- CreateIndex
CREATE INDEX "Tagstoproblems_tag_id_idx" ON "Tagstoproblems"("tag_id");

-- CreateIndex
CREATE INDEX "Tagstoproblems_problem_id_idx" ON "Tagstoproblems"("problem_id");

-- CreateIndex
CREATE INDEX "mailproblemTags_tag_id_idx" ON "mailproblemTags"("tag_id");

-- CreateIndex
CREATE INDEX "usermailprops_user_id_idx" ON "usermailprops"("user_id");

-- AddForeignKey
ALTER TABLE "Tagstoproblems" ADD CONSTRAINT "Tagstoproblems_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagstoproblems" ADD CONSTRAINT "Tagstoproblems_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
