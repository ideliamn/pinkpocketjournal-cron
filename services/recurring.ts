import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

export async function generateBills() {
    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];

    const { data: updateBill, error: errorUpdateBill } = await supabase
        .from("bills")
        .update({ status: "overdue" })
        .lt("due_date", today)
        .eq("status", "pending")

    console.log("Success update bill: " + updateBill)

    if (errorUpdateBill) {
        console.error("Error update bill:", errorUpdateBill);
    }

    const { data: bills, error: errorGetBills } = await supabase.from("bills").select("*").lt("due_date", today);

    if (errorGetBills) {
        console.error("Error get bills:", errorGetBills);
    }

    if (!bills || bills.length < 1) return;

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
    }
}