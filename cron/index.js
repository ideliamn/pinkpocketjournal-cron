import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
// import { generateBills } from "./services/recurring";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1 0 * * * (at 00.01)
// * * * * * (every minute)
cron.schedule("* * * * *", async () => {
    console.log("⏰ Running scheduled job:", new Date().toISOString());
    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];

    const { data: updateBill, error: errorUpdateBill } = await supabase
        .from("bills")
        .update({ status: "overdue" })
        .lt("due_date", today)
        .eq("status", "pending")

    if (!updateBill) {
        console.log("No overdue pending bills found!")
    } else {
        console.log("Success update bill: " + updateBill)
    }

    if (errorUpdateBill) {
        console.error("Error update bill:", errorUpdateBill);
    }

    const { data: bills, error: errorGetBills } = await supabase.from("bills").select("*").lt("due_date", today);

    if (errorGetBills) {
        console.error("Error get bills:", errorGetBills);
    }

    if (!bills || bills.length < 1) {
        console.log("No overdue bills found!")
    }

    const addNewBills = bills
        .filter((b) => b.recurrence_interval && b.recurrence_interval !== "none")
        .map((b) => {
            const oldDueDate = new Date(b.due_date);
            let newDueDate = null;
            if (b.recurrence_interval === "daily") {
                newDueDate = new Date(oldDueDate.setDate(oldDueDate.getDate() + 1));
            } else if (b.recurrence_interval === "weekly") {
                newDueDate = new Date(oldDueDate.setDate(oldDueDate.getDate() + 7));
            } else if (b.recurrence_interval === "monthly") {
                newDueDate = new Date(oldDueDate.setMonth(oldDueDate.getMonth() + 1));
            }
            return {
                user_id: b.user_id,
                budget_id: b?.budget_id ?? null,
                category_id: b.category_id,
                source_id: b.source_id,
                description: b.description,
                amount: b.amount,
                due_date: newDueDate?.toISOString().split("T")[0] ?? null,
                recurrence_interval: b.recurrence_interval,
                status: "pending"
            }
        });

    if (addNewBills.length > 0) {
        const { data: insertBill, error: errorInsertBill } = await supabase
            .from("bills")
            .insert(addNewBills);

        console.log("Success insert bill: ", insertBill)

        if (errorInsertBill) {
            console.error("error insert bill:", errorInsertBill);
        }
    } else {
        console.log("No recurring overdue bills found!")
    }
});
