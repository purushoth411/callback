// models/helperModel.js
const db = require('../config/db'); // Update path if needed


const getAllActiveTeams = (callback) => {
    const sql = `
        SELECT * FROM tbl_team
        ORDER BY fld_addedon DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results);
    });
};

const getTeams = (callback) => {
    const sql = `
        SELECT 
          *
        FROM 
            tbl_team 
       
        ORDER BY 
            tbl_team.fld_addedon DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results);
    });
};


const getAllDomains = (callback) => {
  const sql = `
    SELECT 
      id, 
      domain,
      fld_addedon,
      status,
      cosultantId
    FROM tbl_domain_pref
    ORDER BY id DESC
  `;

  db.query(sql, [], (err, results) => {
    if (err) return callback(err, null);

   

    return callback(null, results);
  });
};
const getHistory = (taskId, callback) => {
    const sql = `
        SELECT 
            r.*
        FROM 
            tbl_task_history r
        WHERE 
            r.fld_task_id = ?
        ORDER BY 
            r.id ASC
    `;

    db.query(sql, [taskId], (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results || []);
    });
};

const getReminders = (taskId, userId, callback) => {
    const sql = `
        SELECT 
            r.*
        FROM 
            tbl_reminders r
        WHERE 
            r.task_id = ?
        AND  
            r.user_id = ?
        ORDER BY 
            r.id ASC
    `;

    db.query(sql, [taskId, userId], (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results || []);
    });
};

const addTaskHistory = (taskId, message, userId, callback) => {
    const sql = `
        INSERT INTO tbl_task_history 
        (fld_task_id, fld_history, fld_userid, fld_status, created_at, updated_at)
        VALUES (?, ?, ?, 1, NOW(), NOW())
    `;

    db.query(sql, [taskId, message, userId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};


const updateFollower = (taskId, followerString, callback) => {
    const sql = `
        UPDATE tbl_task
        SET fld_follower = ?
        WHERE id = ?
    `;

    db.query(sql, [followerString, taskId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

const updateTags = (taskId, tagString, callback) => {
    const sql = `
        UPDATE tbl_task
        SET task_tag = ?
        WHERE id = ?
    `;

    db.query(sql, [tagString, taskId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

const markAsOngoing = (taskId, userId, callback) => {
    const sql = `
        UPDATE tbl_task
        SET 
            is_marked_as_ongoing = 1,
            marked_as_ongoing_by = ?
        WHERE id = ?
    `;

    db.query(sql, [userId, taskId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

const markAsCompleted = (taskId, userId, callback) => {
    const sql = `
        UPDATE tbl_task
        SET 
            fld_task_status = 'Completed'
        WHERE id = ?
    `;

    db.query(sql, [ taskId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

const transferTask = (taskId, newUserId, userId, callback) => {
    // First get current followers
    const getFollowersSql = `
        SELECT fld_follower FROM tbl_task WHERE id = ?
    `;
    db.query(getFollowersSql, [taskId], (err, results) => {
        if (err) return callback(err, null);

        let currentFollowers = results[0]?.fld_follower || "";
        let followerArray = currentFollowers ? currentFollowers.split(",").map(id => id.trim()) : [];

        // Avoid duplicate
        if (!followerArray.includes(userId.toString())) {
            followerArray.push(userId.toString());
        }

        const updatedFollowers = followerArray.join(",");

        // Now update assign_to and followers
        const updateSql = `
            UPDATE tbl_task
            SET fld_assign_to = ?, fld_follower = ?
            WHERE id = ?
        `;
        db.query(updateSql, [newUserId, updatedFollowers, taskId], (err2, result) => {
            if (err2) return callback(err2, null);
            return callback(null, result);
        });
    });
};


const getAllTags = (callback) => {
    const sql = `
        SELECT 
            t.id,
            t.tag_name,
            t.created_by,
            t.created_at,
            a.fld_first_name,
            a.fld_last_name
        FROM 
            tbl_task_tags t
        LEFT JOIN 
            tbl_admin a ON t.created_by = a.id
        ORDER BY 
            t.created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results);
    });
};


const getAllBenchmarks = (callback) => {
    const sql = `
        SELECT 
            b.*, 
            CONCAT(a.fld_first_name, ' ', a.fld_last_name) AS milestone_creator
        FROM 
            tbl_benchmark b
        LEFT JOIN 
            tbl_admin a ON a.id = b.fld_added_by
    `;
    db.query(sql, (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results);
    });
}


const getAllProjects = (callback) => {
    const sql = `
        SELECT 
            p.*, 
            CONCAT(a.fld_first_name, ' ', a.fld_last_name) AS project_creator
        FROM 
            tbl_projects p
        LEFT JOIN 
            tbl_admin a ON a.id = p.fld_created_by
    `;
    db.query(sql, (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results);
    });
}


const getAllBuckets = (callback) => {
    const sql = `
        SELECT 
            b.*, 
            CONCAT(a.fld_first_name, ' ', a.fld_last_name) AS bucket_creator
        FROM 
            tbl_bucket b
        LEFT JOIN 
            tbl_admin a ON a.id = b.fld_added_by
    `;
    db.query(sql, (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results);
    });
}

const getAllRequirements = (callback) => {
    const sql = 'SELECT * from tbl_requirement';
    db.query(sql, (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results);
    })
}

const getAllCurrency = (callback) => {
    const sql = 'SELECT * from tbl_currency';
    db.query(sql, (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results);
    })
}

const getAllOtherTags = (callback) => {
    const sql = 'SELECT * from tbl_tags';
    db.query(sql, (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results);
    })
}

const getTaskDetails = (taskId, callback) => {
    const sql = `SELECT * FROM tbl_task WHERE id = ? LIMIT 1`;
    db.query(sql, [taskId], (err, results) => {
        if (err) return callback(err, null);
        return callback(null, results[0] || null);
    });
};

// Get benchmark details
const getBenchmarkInfo = (benchmarkId) => {
    return new Promise((resolve) => {
        const sql = `SELECT * FROM tbl_benchmark WHERE id = ? LIMIT 1`;
        db.query(sql, [benchmarkId], (err, results) => {
            if (err) return resolve(null);
            resolve(results[0] || null);
        });
    });
};

// Get benchmark completed info
const getBenchmarkCompletedInfo = (benchmarkId, taskId) => {
    return new Promise((resolve) => {
        const sql = `
            SELECT * FROM tbl_benchmark_completed 
            WHERE fld_benchmark_id = ? AND fld_task_id = ? LIMIT 1
        `;
        db.query(sql, [benchmarkId, taskId], (err, results) => {
            if (err) return resolve(null);
            resolve(results[0] || null);
        });
    });
};

// Get admin name by ID
const getAdminNameById = (adminId) => {
    return new Promise((resolve) => {
        const sql = `SELECT fld_first_name , fld_last_name FROM tbl_admin WHERE id = ? LIMIT 1`;
        db.query(sql, [adminId], (err, results) => {
            if (err) return resolve(null);
            resolve(results[0]?.fld_first_name + " " + results[0]?.fld_last_name || null);
        });
    });
};




const getAllTeams = (callback) => {
    const teamSql = 'SELECT * FROM tbl_teams';
    db.query(teamSql, (err, teams) => {
        if (err) return callback(err, null);

        const adminSql = 'SELECT id, fld_first_name, fld_last_name FROM tbl_admin';
        db.query(adminSql, (err2, admins) => {
            if (err2) return callback(err2, null);

            // Create a map of admin IDs to full names
            const adminMap = {};
            admins.forEach(admin => {
                adminMap[admin.id] = `${admin.fld_first_name} ${admin.fld_last_name}`;
            });

            // Build the final team data
            const teamsWithDetails = teams.map(team => {
                // Get team member names
                const memberIds = team.team_members ? team.team_members.split(',').map(id => parseInt(id.trim())) : [];
                const memberNames = memberIds.map(id => adminMap[id] || 'Unknown');

                // Get creator name
                const createdByName = adminMap[team.created_by] || 'Unknown';

                return {
                    ...team,
                    team_members_details: memberNames,
                    created_by_name: createdByName
                };
            });

            return callback(null, teamsWithDetails);
        });
    });
};

const updateTeam = (teamId, teamName, teamMembers, callback) => {
    const sql = 'UPDATE tbl_teams SET team_name = ?, team_members = ? WHERE id = ?';
    db.query(sql, [teamName, teamMembers, teamId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

const createTeam = (teamName, teamMembers, createdBy, callback) => {
    const sql = 'INSERT INTO tbl_teams (team_name, team_members, created_by) VALUES (?, ?, ?)';
    db.query(sql, [teamName, teamMembers, createdBy], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

const deleteTeam = (teamId, callback) => {
    const sql = 'DELETE FROM tbl_teams WHERE id = ?';
    db.query(sql, [teamId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

///////////////tags
// Get all tags


// Add a new tag
const addTag = (tagName, createdBy, callback) => {
    const sql = 'INSERT INTO tbl_task_tags (tag_name, created_by, created_at) VALUES (?, ?, NOW())';
    db.query(sql, [tagName, createdBy], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Update a tag
const updateTag = (tagId, tagName, callback) => {
    const sql = 'UPDATE tbl_task_tags SET tag_name = ? WHERE id = ?';
    db.query(sql, [tagName, tagId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Delete a tag
const deleteTag = (tagId, callback) => {
    const sql = 'DELETE FROM tbl_task_tags WHERE id = ?';
    db.query(sql, [tagId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};


//////////////////bucket

const addBucket = (bucketData, callback) => {
    const sql = `
        INSERT INTO tbl_bucket 
        (fld_bucket_name, fld_added_by, fld_admin_type, fld_default_benchmark, fld_default_description, need_comments, fld_addedon, status)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
    `;
    const values = [
        bucketData.fld_bucket_name,
        bucketData.fld_added_by,
        bucketData.fld_admin_type,
        bucketData.fld_default_benchmark,
        bucketData.fld_default_description,
        bucketData.need_comments,
        bucketData.status || 'Active'
    ];
    db.query(sql, values, (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Update Bucket
const updateBucket = (bucketId, bucketData, callback) => {
    const sql = `
        UPDATE tbl_bucket SET 
        fld_bucket_name = ?, 
        fld_default_benchmark = ?, 
        fld_default_description = ?, 
        need_comments = ?, 
        status = ? 
        WHERE id = ?
    `;
    const values = [
        bucketData.fld_bucket_name,
        bucketData.fld_default_benchmark,
        bucketData.fld_default_description,
        bucketData.need_comments,
        bucketData.status,
        bucketId
    ];
    db.query(sql, values, (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Delete Bucket
const deleteBucket = (bucketId, callback) => {
    const sql = 'DELETE FROM tbl_bucket WHERE id = ?';
    db.query(sql, [bucketId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};
/////////////////////benchamrk

// Add a new benchmark
const addBenchmark = (benchmarkName, addedBy, adminType, callback) => {
    const sql = `INSERT INTO tbl_benchmark (fld_benchmark_name, fld_added_by, fld_admin_type, fld_addedon, status) 
                 VALUES (?, ?, ?, CURDATE(), 'Active')`;
    db.query(sql, [benchmarkName, addedBy, adminType], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Update benchmark
const updateBenchmark = (benchmarkId, benchmarkName, callback) => {
    const sql = 'UPDATE tbl_benchmark SET fld_benchmark_name = ? WHERE id = ?';
    db.query(sql, [benchmarkName, benchmarkId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Delete benchmark
const deleteBenchmark = (benchmarkId, callback) => {
    const sql = 'DELETE FROM tbl_benchmark WHERE id = ?';
    db.query(sql, [benchmarkId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

/////////project

// Add a new project
const addProject = (projectName, createdBy, requireEmail, emailId, callback) => {
    const sql = `INSERT INTO tbl_projects (fld_project_name, fld_created_by, created_at, updated_at, require_email, email_id) 
                 VALUES (?, ?, NOW(), NOW(), ?, ?)`;
    db.query(sql, [projectName, createdBy, requireEmail, emailId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Update an existing project
const updateProject = (projectId, projectName, requireEmail, emailId, callback) => {
    const sql = `UPDATE tbl_projects 
                 SET fld_project_name = ?, require_email = ?, email_id = ?, updated_at = NOW() 
                 WHERE id = ?`;
    db.query(sql, [projectName, requireEmail, emailId, projectId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Delete a project
const deleteProject = (projectId, callback) => {
    const sql = 'DELETE FROM tbl_projects WHERE id = ?';
    db.query(sql, [projectId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};


const addRequirement = (category, name, callback) => {
    const sql = `INSERT INTO tbl_requirement (category, name) VALUES (?, ?)`;
    db.query(sql, [category, name], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Update requirement
const updateRequirement = (requirementId, category, name, callback) => {
    const sql = `UPDATE tbl_requirement SET category = ?, name = ? WHERE id = ?`;
    db.query(sql, [category, name, requirementId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Delete requirement
const deleteRequirement = (requirementId, callback) => {
    const sql = `DELETE FROM tbl_requirement WHERE id = ?`;
    db.query(sql, [requirementId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Add currency
const addCurrency = (name, callback) => {
    const sql = `INSERT INTO tbl_currency (name) VALUES (?)`;
    db.query(sql, [name], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Update currency
const updateCurrency = (currencyId, name, callback) => {
    const sql = `UPDATE tbl_currency SET name = ? WHERE id = ?`;
    db.query(sql, [name, currencyId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Delete currency
const deleteCurrency = (currencyId, callback) => {
    const sql = `DELETE FROM tbl_currency WHERE id = ?`;
    db.query(sql, [currencyId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};


/////////////////other tags

// Add Other Tag
const addOtherTag = (user_id, category, tag_name, tag_type, callback) => {
    const sql = `INSERT INTO tbl_tags (user_id, category, tag_name, tag_type) VALUES (?, ?, ?, ?)`;
    db.query(sql, [user_id, category, tag_name, tag_type], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Update Other Tag
const updateOtherTag = (tagId, category, tag_name, tag_type, callback) => {
    const sql = `UPDATE tbl_tags SET category = ?, tag_name = ?, tag_type = ? WHERE id = ?`;
    db.query(sql, [category, tag_name, tag_type, tagId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

// Delete Other Tag
const deleteOtherTag = (tagId, callback) => {
    const sql = `DELETE FROM tbl_tags WHERE id = ?`;
    db.query(sql, [tagId], (err, result) => {
        if (err) return callback(err, null);
        return callback(null, result);
    });
};

module.exports = {
   
    getAllTeams,
    getAllActiveTeams,
    getAllDomains
   
};
