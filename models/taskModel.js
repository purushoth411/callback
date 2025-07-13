const db = require('../config/db');

const getTasks = (userId, userType, assigned_team, filters, callback) => {
    let sql = `
        SELECT 
            t.*,
            t.id as task_id,
            assignedUser.fld_first_name AS assigned_to_name,
            assignedUser.fld_email AS assigned_to_email,
            addedByUser.fld_first_name AS added_by_name,
            addedByUser.fld_email AS added_by_email,
            b.id,
            b.fld_bucket_name AS bucket_display_name,
            GROUP_CONCAT(tag.tag_name) AS tag_names
        FROM 
            tbl_task t
        LEFT JOIN tbl_admin assignedUser ON t.fld_assign_to = assignedUser.id
        LEFT JOIN tbl_admin addedByUser ON t.fld_added_by = addedByUser.id
        LEFT JOIN tbl_bucket b ON t.fld_bucket_name = b.id
        LEFT JOIN tbl_task_tags tag ON FIND_IN_SET(tag.id, t.task_tag)
        WHERE 1 = 1
    `;

    const params = [];

    const buildRemainingFiltersAndExecute = () => {
        if (filters.taskNameOrId) {
            sql += ` AND (t.fld_title LIKE ? OR t.fld_unique_task_id LIKE ?)`;
            params.push(`%${filters.taskNameOrId}%`, `%${filters.taskNameOrId}%`);
        }

        if (filters.assignedTo) {
            sql += ` AND t.fld_assign_to = ?`;
            params.push(filters.assignedTo);
        }

        if (filters.assignedBy) {
            sql += ` AND t.fld_added_by = ?`;
            params.push(filters.assignedBy);
        }

        if (filters.bucketName) {
            sql += ` AND t.fld_bucket_name = ?`;
            params.push(filters.bucketName);
        }

        if (filters.taskStatus) {
            if (filters.taskStatus === "Overdue") {
                sql += ` AND t.fld_task_status != ? AND t.fld_task_status != ? AND t.fld_due_date < CURDATE()`;
                params.push('Updated', 'Completed');
            } else {
                sql += ` AND t.fld_task_status = ?`;
                params.push(filters.taskStatus);
            }
        }

        if (filters.milestone) {
            sql += ` AND t.fld_benchmark_name LIKE ?`;
            params.push(`%${filters.milestone}%`);
        }

        if (filters.milestoneStatus) {
            sql += ` AND t.fld_benchmark_completed_by LIKE ?`;
            params.push(`%${filters.milestoneStatus}%`);
        }

        if (filters.milestoneCompletionStatus) {
            sql += ` AND t.fld_completed_benchmarks LIKE ?`;
            params.push(`%${filters.milestoneCompletionStatus}%`);
        }

        if (filters.queryStatus) {
            sql += ` AND t.query_status = ?`;
            params.push(filters.queryStatus);
        }

        if (filters.paymentRange) {
            sql += ` AND t.payment_due <= ?`;
            params.push(filters.paymentRange);
        }

        if (filters.createdDate) {
            sql += ` AND DATE(t.fld_addedon) = ?`;
            params.push(filters.createdDate);
        }

        if (filters.dueDate) {
            sql += ` AND t.fld_due_date = ?`;
            params.push(filters.dueDate);
        }

        sql += `
            GROUP BY t.id
            ORDER BY t.id DESC
            LIMIT 500
        `;

        db.query(sql, params, (err, results) => {
            if (err) return callback(err, null);
            return callback(null, results);
        });
    };

    if (userType === "TEAM MEMBER") {
        sql += ` AND (t.fld_assign_to = ? OR t.fld_added_by = ?)`;
        params.push(userId, userId);
        buildRemainingFiltersAndExecute();
    } else if (userType === "SUBADMIN" && assigned_team) {
        const teamIds = assigned_team.split(',').map(id => id.trim()).filter(Boolean);

        if (teamIds.length > 0) {
            const teamQuery = `SELECT team_members FROM tbl_teams WHERE id IN (${teamIds.map(() => '?').join(',')})`;
            db.query(teamQuery, teamIds, (err, teamResults) => {
                if (err) return callback(err, null);

                let teamUserIds = [];
                teamResults.forEach(row => {
                    if (row.team_members) {
                        const members = row.team_members.split(',').map(id => id.trim());
                        teamUserIds.push(...members);
                    }
                });

                const allUserIds = [...new Set([...teamUserIds, userId])]; // Unique list
                const placeholders = allUserIds.map(() => '?').join(',');

                sql += ` AND (t.fld_assign_to IN (${placeholders}) OR t.fld_added_by IN (${placeholders}))`;
                params.push(...allUserIds, ...allUserIds);

                buildRemainingFiltersAndExecute();
            });
        } else {
            sql += ` AND (t.fld_assign_to = ? OR t.fld_added_by = ?)`;
            params.push(userId, userId);
            buildRemainingFiltersAndExecute();
        }
    } else {
        buildRemainingFiltersAndExecute();
    }
};


const getTaskById = (taskId, callback) => {
    const sql = `
        SELECT 
            t.*,

            assignedUser.fld_first_name AS assigned_to_name,
            assignedUser.fld_email AS assigned_to_email,

            addedByUser.fld_first_name AS added_by_name,
            addedByUser.fld_email AS added_by_email,

            b.id AS bucket_id,
            b.fld_bucket_name AS bucket_display_name,

            GROUP_CONCAT(DISTINCT tag.tag_name) AS tag_names,

            ongoingUser.fld_first_name AS ongoing_by_name,
            ongoingUser.fld_email AS ongoing_by_email

        FROM tbl_task t

        LEFT JOIN tbl_admin assignedUser ON t.fld_assign_to = assignedUser.id
        LEFT JOIN tbl_admin addedByUser ON t.fld_added_by = addedByUser.id
        LEFT JOIN tbl_admin ongoingUser ON t.marked_as_ongoing_by = ongoingUser.id

        LEFT JOIN tbl_bucket b ON t.fld_bucket_name = b.id
        LEFT JOIN tbl_task_tags tag ON FIND_IN_SET(tag.id, t.task_tag)

        WHERE t.id = ?
        GROUP BY t.id
    `;

    db.query(sql, [taskId], async (err, results) => {
        if (err) return callback(err, null);
        if (!results || results.length === 0) return callback(null, null);

        const task = results[0];

        // Now handle the follower users (comma-separated IDs)
        const followerIds = task.fld_follower ? task.fld_follower.split(',').map(id => parseInt(id)) : [];

        if (followerIds.length > 0) {
            const followerSql = `
                SELECT id, fld_first_name AS name, fld_email AS email
                FROM tbl_admin
                WHERE id IN (?)
            `;
            db.query(followerSql, [followerIds], (followerErr, followers) => {
                if (followerErr) return callback(followerErr, null);

                task.followers = followers;
                return callback(null, task);
            });
        } else {
            task.followers = [];
            return callback(null, task);
        }
    });
};

module.exports = {
    getTasks,
    getTaskById
};
