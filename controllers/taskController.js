const taskModel = require('../models/taskModel');
const db = require('../config/db');
const moment = require('moment');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const getTasks = (req, res) => {
    const { user_type, user_id, assigned_team, filters } = req.body;

    if (!user_type || !user_id) {
        return res.status(400).json({ status: false, message: 'user_type and user_id are required' });
    }

    taskModel.getTasks(user_id, user_type, assigned_team, filters, (err, tasks) => {
        if (err) {
            console.error('Error fetching tasks:', err);
            return res.status(500).json({ status: false, message: 'Server error' });
        }

        return res.json({ status: true, message: 'Success', data: tasks });
    });
};

const getTaskById = (req, res) => {
    const { task_id } = req.body;

    if (!task_id) {
        return res.status(400).json({ status: false, message: 'task_id is required' });
    }

    taskModel.getTaskById(task_id, (err, task) => {
        if (err) {
            console.error('Error fetching task:', err);
            return res.status(500).json({ status: false, message: 'Server error' });
        }

        if (!task) {
            return res.status(404).json({ status: false, message: 'Task not found' });
        }

        return res.json({ status: true, message: 'Success', data: task });
    });
};

///////////////////////////////////////////////////

// Helper functions (you'll need to implement these based on your existing helpers)
const getAdminNameById = (adminId) => {
    // Implementation needed - return admin name by ID
    return new Promise((resolve, reject) => {
        const sql = `SELECT fld_first_name, fld_last_name FROM tbl_admin WHERE id = ?`;
        db.query(sql, [adminId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]?.fld_first_name + " " + results[0]?.fld_last_name || 'Unknown');
        });
    });
};

const getBenchmarkInfobytask = (benchmark, status, taskId) => {
    // Implementation needed - return benchmark info
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM tbl_benchmark WHERE id = ? AND status = ?`;
        db.query(sql, [benchmark, status], (err, results) => {
            if (err) return reject(err);
            resolve(results[0] || null);
        });
    });
};

const base64url_encode = (str) => {
    return Buffer.from(str).toString('base64url');
};

const closeTask = async (req, res) => {
    try {
        const { task_type, task_id, benchmark, remarks, closetask, is_marked_as_ongoing, hidden_milestones, user_id, user_type } = req.body;
        const benchmarkArray = Array.isArray(benchmark) ? benchmark.map(String) : [];
        const adminId = user_id; // Assuming session middleware is used

        // Step 1: Fetch the task
        const fetchTaskSql = `SELECT * FROM tbl_task WHERE id = ? LIMIT 1`;
        const taskResults = await new Promise((resolve, reject) => {
            db.query(fetchTaskSql, [task_id], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        if (!taskResults || taskResults.length === 0) {
            return res.status(404).json({ status: false, message: 'Task not found' });
        }

        const task = taskResults[0];
        const completedBenchmarks = task.fld_completed_benchmarks ? task.fld_completed_benchmarks.split(',') : [];
        const lastCompletedAt = task.fld_last_benchmark_completed_at;
        const completedCount = completedBenchmarks.length || 11;

        // Step 2: Check 10-minute lock (converted from 300 seconds to 5 minutes)
        if (lastCompletedAt && completedCount > 10) {
            const nextAllowed = moment(lastCompletedAt).add(5, 'minutes');
            const now = moment();

            if (now.isBefore(nextAllowed)) {
                const remainingTime = nextAllowed.diff(now, 'seconds');
                const displayTime = remainingTime < 60 ?
                    `${remainingTime} seconds` :
                    `${Math.round(remainingTime / 60)} minutes`;


                return res.status(404).json({ status: false, message: `You can update your next milestone after ${displayTime} only.` });

            }
        }

        // Step 3: Update last benchmark completed timestamp
        const updateTimestampSql = `UPDATE tbl_task SET fld_last_benchmark_completed_at = ? WHERE id = ?`;
        await new Promise((resolve, reject) => {
            db.query(updateTimestampSql, [moment().format('YYYY-MM-DD HH:mm:ss'), task_id], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // Step 4: Handle benchmark logic for crm_query tasks
        if (task_type === "crm_query") {
            await handleCrmQueryBenchmarks(task_id, benchmarkArray);
        }

        // Step 5: Update completed benchmarks tracking
        if (benchmarkArray.length > 0) {
            for (const benchmarkName of benchmarkArray) {
                const currentBenchmarkData = await getCurrentBenchmark(task_id);
                const newBenchmarkData = currentBenchmarkData ?
                    `${currentBenchmarkData},${benchmarkName}-${adminId}` :
                    `${benchmarkName}-${adminId}`;

                await updateCompletedBy(newBenchmarkData, task_id);
            }
        }

        // Step 6: Handle task closure
        if (closetask === 'on') {
            const updateTaskSql = `UPDATE tbl_task SET fld_task_status = 'Updated', fld_reopen = '0' WHERE id = ?`;
            await new Promise((resolve, reject) => {
                db.query(updateTaskSql, [task_id], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
        }

        // Step 7: Handle remarks and completion
        if (hidden_milestones === 'No') {
            await handleNoMilestones(req, res, task_id, remarks, is_marked_as_ongoing, adminId, user_type);
        } else {
            await handleWithMilestones(req, res, task_id, remarks, benchmarkArray, adminId, user_type);
        }

    } catch (error) {
        console.error('Error in closeTask:', error);

        return res.status(404).json({ status: false, message: `An error occurred while processing the task` });

    }
};

const handleCrmQueryBenchmarks = async (taskId, benchmarkArray) => {
    const getTaskBenchmarksSql = `SELECT fld_benchmark_name, fld_completed_benchmarks FROM tbl_task WHERE id = ?`;
    const taskData = await new Promise((resolve, reject) => {
        db.query(getTaskBenchmarksSql, [taskId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]);
        });
    });

    if (!taskData) return;

    const existingBenchmarks = taskData.fld_benchmark_name ? taskData.fld_benchmark_name.split(',').filter(b => b) : [];
    const completedBenchmarks = taskData.fld_completed_benchmarks ? taskData.fld_completed_benchmarks.split(',').filter(b => b) : [];

    // Handle benchmark 54 (initial discussion done)
    if (benchmarkArray.includes('54')) {
        const is54NotCompleted = !completedBenchmarks.includes('54');
        const is67NotCompleted = !completedBenchmarks.includes('67');

        let updatedBenchmarks = existingBenchmarks;
        if (is54NotCompleted && is67NotCompleted) {
            updatedBenchmarks = existingBenchmarks.filter(b => b !== '67');
        }

        if (!updatedBenchmarks.includes('54')) {
            updatedBenchmarks.push('54');
        }

        await updateTaskBenchmarks(taskId, updatedBenchmarks);
    }

    // Handle benchmark 67 (call not answered)
    if (benchmarkArray.includes('67')) {
        const updatedBenchmarks = [...existingBenchmarks];
        const index67 = updatedBenchmarks.indexOf('67');
        if (index67 !== -1 && !updatedBenchmarks.includes('68')) {
            updatedBenchmarks.splice(index67 + 1, 0, '68');
        }
        await updateTaskBenchmarks(taskId, updatedBenchmarks);
    }

    // Handle benchmark 68 (email done)
    if (benchmarkArray.includes('68')) {
        const updatedBenchmarks = [...existingBenchmarks];
        const index68 = updatedBenchmarks.indexOf('68');
        if (index68 !== -1) {
            if (!updatedBenchmarks.includes('69')) {
                updatedBenchmarks.splice(index68 + 1, 0, '69');
            }
            if (!updatedBenchmarks.includes('70')) {
                updatedBenchmarks.splice(index68 + 2, 0, '70');
            }
        }
        await updateTaskBenchmarks(taskId, updatedBenchmarks);
    }

    // Handle benchmark 69 (replied)
    if (benchmarkArray.includes('69')) {
        let updatedBenchmarks = existingBenchmarks.filter(b => b !== '70');
        const index69 = updatedBenchmarks.indexOf('69');
        if (index69 !== -1) {
            if (!updatedBenchmarks.includes('71')) {
                updatedBenchmarks.splice(index69 + 1, 0, '71');
            }
            if (!updatedBenchmarks.includes('72')) {
                updatedBenchmarks.splice(index69 + 2, 0, '72');
            }
        }
        await updateTaskBenchmarks(taskId, updatedBenchmarks);
    }

    // Handle benchmark 71 (interested)
    if (benchmarkArray.includes('71')) {
        const updatedBenchmarks = existingBenchmarks.filter(b => b !== '72');
        await updateTaskBenchmarks(taskId, updatedBenchmarks);
    }

    // Handle benchmarks 70 or 72 (not replied/not interested)
    if (benchmarkArray.includes('70') || benchmarkArray.includes('72')) {
        const baseBenchmarks = ['67', '68'];
        if (benchmarkArray.includes('70')) {
            baseBenchmarks.push('70');
        }
        if (benchmarkArray.includes('72')) {
            baseBenchmarks.push('69', '72');
        }
        await updateTaskBenchmarks(taskId, baseBenchmarks);
    }
};

const updateTaskBenchmarks = async (taskId, benchmarks) => {
    const updateSql = `UPDATE tbl_task SET fld_benchmark_name = ? WHERE id = ?`;
    return new Promise((resolve, reject) => {
        db.query(updateSql, [benchmarks.join(','), taskId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

const getCurrentBenchmark = async (taskId) => {
    const sql = `SELECT fld_completed_benchmarks FROM tbl_task WHERE id = ?`;
    return new Promise((resolve, reject) => {
        db.query(sql, [taskId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]?.fld_completed_benchmarks || '');
        });
    });
};

const updateCompletedBy = async (benchmarkData, taskId) => {
    const sql = `UPDATE tbl_task SET fld_completed_benchmarks = ? WHERE id = ?`;
    return new Promise((resolve, reject) => {
        db.query(sql, [benchmarkData, taskId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

const handleNoMilestones = async (req, res, taskId, remarks, isMarkedAsOngoing, adminId, user_type) => {
    // Insert remark
    const remarkData = {
        fld_admin_type: user_type,
        fld_task_id: taskId,
        fld_remark: remarks || null,
        fld_addedon: moment().format('YYYY-MM-DD HH:mm:ss'),
        fld_added_by: adminId
    };

    const insertRemarkSql = `INSERT INTO tbl_remarks SET ?`;
    const insertId = await new Promise((resolve, reject) => {
        db.query(insertRemarkSql, remarkData, (err, result) => {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });

    // Update task status if not marked as ongoing
    if (isMarkedAsOngoing != 1) {
        const updateTaskSql = `UPDATE tbl_task SET fld_task_status = 'Updated' WHERE id = ?`;
        await new Promise((resolve, reject) => {
            db.query(updateTaskSql, [taskId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }

    if (insertId > 0) {
        // Handle file uploads if present
        if (req.files && req.files.closed_task_file_upload) {
            // File upload logic here
        }

        // Insert history
        const adminName = await getAdminNameById(adminId);
        const historyMsg = isMarkedAsOngoing != 1 ?
            `${adminName} Updated the task` :
            `${adminName} completed the milestone`;

        const historyData = {
            fld_task_id: taskId,
            fld_userid: adminId,
            fld_history: historyMsg,
            fld_status: 1,
            created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };

        const insertHistorySql = `INSERT INTO tbl_task_history SET ?`;
        await new Promise((resolve, reject) => {
            db.query(insertHistorySql, historyData, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        return res.json({ status: true, message: 'Data submitted successfully', });

    } else {

        return res.status(500).json({ status: false, message: `Data not submitted!` });

    }
};

const handleWithMilestones = async (req, res, taskId, remarks, benchmarkArray, adminId, user_type) => {
    try {
        const benchmark = benchmarkArray.join(',');

        // Insert remark
        const remarkData = {
            fld_admin_type: user_type,
            fld_task_id: taskId,
            fld_remark: remarks || null,
            fld_addedon: moment().format('YYYY-MM-DD HH:mm:ss'),
            fld_added_by: adminId,
            fld_benchmarks: benchmark
        };

        const insertRemarkSql = `INSERT INTO tbl_remarks SET ?`;
        const insertId = await new Promise((resolve, reject) => {
            db.query(insertRemarkSql, remarkData, (err, result) => {
                if (err) return reject(err);
                resolve(result.insertId);
            });
        });

        // Insert each completed benchmark separately
        let anyInserted = false;
        for (const benchId of benchmarkArray) {
            const benchmarkInfo = await getBenchmarkInfobytask(benchId, 'Active', taskId);

            const completedBenchmarkData = {
                fld_admin_type: user_type,
                fld_task_id: taskId,
                fld_benchmark_id: benchId,
                fld_benchmark_percent: benchmarkInfo?.fld_benchmark_percent || 0,
                fld_addedon: moment().format('YYYY-MM-DD HH:mm:ss'),
                fld_added_by: adminId,
                status: 'Completed'
            };

            const insertCompletedSql = `INSERT INTO tbl_benchmark_completed SET ?`;
            const insertId1 = await new Promise((resolve, reject) => {
                db.query(insertCompletedSql, completedBenchmarkData, (err, result) => {
                    if (err) return reject(err);
                    resolve(result.insertId);
                });
            });

            if (insertId1 > 0) anyInserted = true;
        }

        // Update task's completed benchmarks
        const getTaskSql = `SELECT fld_completed_benchmarks, fld_benchmark_name FROM tbl_task WHERE id = ?`;
        const taskData = await new Promise((resolve, reject) => {
            db.query(getTaskSql, [taskId], (err, results) => {
                if (err) return reject(err);
                resolve(results[0]);
            });
        });

        if (taskData) {
            const existingBenchmarks = taskData.fld_completed_benchmarks
                ? taskData.fld_completed_benchmarks.split(',').filter(Boolean)
                : [];
            const mergedBenchmarks = Array.from(new Set([...existingBenchmarks, ...benchmarkArray.map(String)]));
            const newCompletedBenchmarks = mergedBenchmarks.join(',');

            const updateTaskSql = `UPDATE tbl_task SET fld_completed_benchmarks = ? WHERE id = ?`;
            await new Promise((resolve, reject) => {
                db.query(updateTaskSql, [newCompletedBenchmarks, taskId], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            // Check if last benchmark is completed
            const benchmarkNames = taskData.fld_benchmark_name
                ? taskData.fld_benchmark_name.split(',').map(s => s.trim())
                : [];
            const lastBenchmark = benchmarkNames[benchmarkNames.length - 1];

            if (benchmarkArray.includes(lastBenchmark)) {
                const updateStatusSql = `UPDATE tbl_task SET fld_task_status = 'Updated' WHERE id = ?`;
                await new Promise((resolve, reject) => {
                    db.query(updateStatusSql, [taskId], (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
            }
        }

        if (anyInserted) {
            // Handle file uploads if present
            if (req.files && req.files.closed_task_file_upload) {
                // File upload logic here
            }

            // Insert history
            const adminName = await getAdminNameById(adminId);
            const historyMsg = `${adminName} completed the milestone(s)`;

            const historyData = {
                fld_task_id: taskId,
                fld_userid: adminId,
                fld_history: historyMsg,
                fld_status: 1,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            };

            const insertHistorySql = `INSERT INTO tbl_task_history SET ?`;
            await new Promise((resolve, reject) => {
                db.query(insertHistorySql, historyData, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            return res.json({ status: true, message: 'Milestone data submitted successfully' });
        } else {
            return res.status(500).json({ status: false, message: `Milestone data not submitted!` });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Server error!', error: error.message });
    }
};
////////////////////////////////////add task

// Helper functions
const getNextNWeeksDates = (startDate, numberOfWeeks) => {
    const dates = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < numberOfWeeks; i++) {
        const nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + (i * 7));
        dates.push(nextDate.toISOString().split('T')[0]);
    }
    return dates;
};

const getNextNMonthsDates = (startDate, numberOfMonths) => {
    const dates = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < numberOfMonths; i++) {
        const nextDate = new Date(currentDate);
        nextDate.setMonth(currentDate.getMonth() + i);
        dates.push(nextDate.toISOString().split('T')[0]);
    }
    return dates;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = './assets/taskfileuploads/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
        const finalName = `${sanitizedBaseName}_${Date.now()}${ext}`;
        cb(null, finalName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /gif|jpg|jpeg|png|pdf|doc|docx|xlsx|csv|rar|zip|odt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

const insertTask = async (req, res) => {
    try {
        const {
            isquerytask,
            bucket_name,
            project_name,
            assigned_to,
            due_date,
            due_time,
            description,
            title,
            fld_asana_link,
            google_sheets_or_docs_link,
            benchmark_name,
            milestone_deadline,
            follower,
            recurring_tasks,
            recurring_duration,
            recurring_type,
            file_names,
            user_id,
            user_name,
            user_type
        } = req.body;

        // Generate unique task ID
        const unique_task_id = 'TASKID#' + Math.floor(Math.random() * (99999 - 11111 + 1) + 11111);

        // Process milestone deadlines
        const milestone_deadline_str = Array.isArray(milestone_deadline) ? milestone_deadline.join(',') : '';

        // Ensure assigned_to is an array
        let assignedToArray = Array.isArray(assigned_to) ? assigned_to : [assigned_to];

        // If elements are stringified arrays, parse them properly
        if (assignedToArray.length === 1 && typeof assignedToArray[0] === 'string' && assignedToArray[0].startsWith('[')) {
            try {
                assignedToArray = JSON.parse(assignedToArray[0]); // Now assignedToArray becomes [278]
            } catch (err) {
                console.error('Invalid JSON format in assigned_to:', assignedToArray[0]);
                assignedToArray = [];
            }
        }


        // Process recurring dates
        let commaSeparatedDates = "";

        if (recurring_type === 'Stop after 3 times repetition' && recurring_duration === 'Weekly') {
            const startDate = new Date().toISOString().split('T')[0];
            const numberOfWeeks = 3;
            const nextWeekDates = getNextNWeeksDates(startDate, numberOfWeeks);
            commaSeparatedDates = nextWeekDates.join(',');
        }

        if (recurring_type === 'Non Stop' && recurring_duration === 'Weekly') {
            const startDate = new Date().toISOString().split('T')[0];
            const numberOfWeeks = 100;
            const nextWeekDates = getNextNWeeksDates(startDate, numberOfWeeks);
            commaSeparatedDates = nextWeekDates.join(',');
        }

        if (recurring_type === 'Stop after 3 times repetition' && recurring_duration === 'Monthly') {
            const startDate = new Date().toISOString().split('T')[0];
            const numberOfMonths = 3;
            const nextMonthDates = getNextNMonthsDates(startDate, numberOfMonths);
            commaSeparatedDates = nextMonthDates.join(',');
        }

        if (recurring_type === 'Non Stop' && recurring_duration === 'Monthly') {
            const startDate = new Date().toISOString().split('T')[0];
            const numberOfMonths = 100;
            const nextMonthDates = getNextNMonthsDates(startDate, numberOfMonths);
            commaSeparatedDates = nextMonthDates.join(',');
        }

        // Process follower array
        const followerArray = Array.isArray(follower) ? follower : [];


        // Parse the benchmark_name
        let benchmarkNamesArray = [];

        if (typeof benchmark_name === 'string') {
            try {
                benchmarkNamesArray = JSON.parse(benchmark_name); // now it's an array of objects
            } catch (error) {
                console.error('Invalid JSON for benchmark_name:', error);
                benchmarkNamesArray = [];
            }
        } else if (Array.isArray(benchmark_name)) {
            benchmarkNamesArray = benchmark_name;
        }

        // Calculate percentage per benchmark
        let percent_per_benchmark = 0;
        if (benchmarkNamesArray.length > 0) {
            percent_per_benchmark = 100 / benchmarkNamesArray.length;
        }

        // Convert to string (e.g., store milestone IDs as comma-separated values)
        const benchmark_names_str = benchmarkNamesArray
            .map(item => item.milestoneId) // or any other property you want
            .join(',');

        //console.log('Benchmark IDs String:', benchmark_names_str);
        //console.log('Percent Per Benchmark:', percent_per_benchmark); 


        // Get user session data (assuming middleware sets req.user)
        const adminId = user_id;
        const adminType = user_type;
        const userName = user_name;

        // Loop through each assigned user
        for (const assign_to of assignedToArray) {
            // Prepare task data
            const task_data = {
                fld_unique_task_id: unique_task_id,
                fld_added_by: adminId,
                fld_admin_type: adminType,
                fld_bucket_name: bucket_name,
                fld_project_name: project_name,
                fld_assign_to: assign_to,
                fld_due_date: due_date,
                fld_due_time: due_time,
                status: 'Active',
                fld_task_status: 'Open',
                fld_description: description,
                fld_title: title,
                fld_addedon: new Date(),
                fld_benchmark_name: benchmark_names_str,
                fld_follower: followerArray.join(','),
                fld_recurring_tasks: recurring_tasks,
                fld_recurring_duration: recurring_duration,
                fld_recurring_type: recurring_type,
                fld_recurring_days: commaSeparatedDates,
                fld_asana_link: fld_asana_link,
                fld_google_sheets_or_docs_link: google_sheets_or_docs_link,
                fld_milestone_deadline: milestone_deadline_str,
                isquerytask: (isquerytask && isquerytask == 1) ? 1 : 0
            };
            //console.log(task_data)

            // Insert task into tbl_task
            const insertTaskSql = `
                INSERT INTO tbl_task 
                (fld_unique_task_id, fld_added_by, fld_admin_type, fld_bucket_name, fld_project_name, 
                 fld_assign_to, fld_due_date, fld_due_time, status, fld_task_status, fld_description, 
                 fld_title, fld_addedon, fld_benchmark_name, fld_follower, fld_recurring_tasks, 
                 fld_recurring_duration, fld_recurring_type, fld_recurring_days, fld_asana_link, 
                 fld_google_sheets_or_docs_link, fld_milestone_deadline, isquerytask) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const taskResult = await new Promise((resolve, reject) => {
                db.query(insertTaskSql, [
                    task_data.fld_unique_task_id, task_data.fld_added_by, task_data.fld_admin_type,
                    task_data.fld_bucket_name, task_data.fld_project_name, task_data.fld_assign_to,
                    task_data.fld_due_date, task_data.fld_due_time, task_data.status,
                    task_data.fld_task_status, task_data.fld_description, task_data.fld_title,
                    task_data.fld_addedon, task_data.fld_benchmark_name, task_data.fld_follower,
                    task_data.fld_recurring_tasks, task_data.fld_recurring_duration,
                    task_data.fld_recurring_type, task_data.fld_recurring_days,
                    task_data.fld_asana_link, task_data.fld_google_sheets_or_docs_link,
                    task_data.fld_milestone_deadline, task_data.isquerytask
                ], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });

            const task_insert_id = taskResult.insertId;

            if (task_insert_id > 0) {
                // Get assigned user name
                const assigned_to_names = await getAdminNameById(assign_to);

                // Insert history
                const historyData = {
                    fld_task_id: task_insert_id,
                    fld_userid: adminId,
                    fld_history: `${userName} created the Task and assigned to ${assigned_to_names}`,
                    fld_status: 1,
                    created_at: new Date()
                };

                const insertHistorySql = `
                    INSERT INTO tbl_task_history (fld_task_id, fld_userid, fld_history, fld_status, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `;

                await new Promise((resolve, reject) => {
                    db.query(insertHistorySql, [
                        historyData.fld_task_id, historyData.fld_userid, historyData.fld_history,
                        historyData.fld_status, historyData.created_at
                    ], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                });

                // Update task status
                const updateStatusSql = `UPDATE tbl_task SET fld_task_status = ? WHERE id = ?`;
                await new Promise((resolve, reject) => {
                    db.query(updateStatusSql, ['Open', task_insert_id], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                });

                for (const benchmark of benchmarkNamesArray) {
                    const benchmark_entry = {
                        fld_task_id: task_insert_id,
                        fld_benchmark_name: benchmark.milestoneId, // extract milestoneId
                        fld_benchmark_percent: percent_per_benchmark,
                        fld_added_by: adminId,
                        fld_admin_type: null,
                        fld_addedon: new Date(),
                        status: 'Active' // Add status field
                    };

                    const insertBenchmarkSql = `
        INSERT INTO tbl_benchmark_percentage 
        (fld_task_id, fld_benchmark_name, fld_benchmark_percent, fld_added_by, fld_admin_type, fld_addedon, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

                    await new Promise((resolve, reject) => {
                        db.query(insertBenchmarkSql, [
                            benchmark_entry.fld_task_id,
                            benchmark_entry.fld_benchmark_name,
                            benchmark_entry.fld_benchmark_percent,
                            benchmark_entry.fld_added_by,
                            benchmark_entry.fld_admin_type,
                            benchmark_entry.fld_addedon,
                            benchmark_entry.status
                        ], (err, results) => {
                            if (err) return reject(err);
                            resolve(results);
                        });
                    });
                }


                // Handle file uploads
                if (req.files && req.files.length > 0) {
                    const uploadedFiles = req.files.map(file => file.filename);
                    const fileNames = uploadedFiles.join(',');

                    // Update task with file names
                    const updateFilesSql = `UPDATE tbl_task SET fld_file_upload = ? WHERE id = ?`;
                    await new Promise((resolve, reject) => {
                        db.query(updateFilesSql, [fileNames, task_insert_id], (err, results) => {
                            if (err) return reject(err);
                            resolve(results);
                        });
                    });
                }

                // Update benchmark percentages
                const getBenchmarksSql = `SELECT * FROM tbl_benchmark_percentage WHERE fld_task_id = ?`;
                const benchmarkResults = await new Promise((resolve, reject) => {
                    db.query(getBenchmarksSql, [task_insert_id], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                });

                if (benchmarkResults.length > 0) {
                    const benchmark_percentarr = benchmarkResults.map(row => row.fld_benchmark_percent);
                    const imploded_percents = benchmark_percentarr.join(',');

                    const updateBenchmarkPercentSql = `UPDATE tbl_task SET fld_benchmark_percent = ? WHERE id = ?`;
                    await new Promise((resolve, reject) => {
                        db.query(updateBenchmarkPercentSql, [imploded_percents, task_insert_id], (err, results) => {
                            if (err) return reject(err);
                            resolve(results);
                        });
                    });
                }
            }
        }

        res.status(200).json({
            status: true,
            message: 'Tasks Added Successfully'
        });

    } catch (error) {
        console.error('Error inserting task:', error);
        res.status(500).json({
            status: false,
            message: 'Error inserting task',
            error: error.message
        });
    }
};

const updateTask = async (req, res) => {
    try {
        const {
            task_id,
            isquerytask,
            bucket_name,
            project_name,
            assigned_to,
            due_date,
            due_time,
            description,
            title,
            fld_asana_link,
            google_sheets_or_docs_link,
            benchmark_name,
            milestone_deadline,
            follower,
            recurring_tasks,
            recurring_duration,
            recurring_type,
            file_names,
            user_id,
            user_name,
            user_type
        } = req.body;

        const milestone_deadline_str = Array.isArray(milestone_deadline) ? milestone_deadline.join(',') : '';

        // Ensure assigned_to is an array
        let assignedToArray = Array.isArray(assigned_to) ? assigned_to : [assigned_to];
        if (assignedToArray.length === 1 && typeof assignedToArray[0] === 'string' && assignedToArray[0].startsWith('[')) {
            try {
                assignedToArray = JSON.parse(assignedToArray[0]);
            } catch (err) {
                console.error('Invalid JSON format in assigned_to:', assignedToArray[0]);
                assignedToArray = [];
            }
        }

        // Recurring dates processing
        let commaSeparatedDates = "";
        const startDate = new Date().toISOString().split('T')[0];

        if (recurring_type === 'Stop after 3 times repetition' && recurring_duration === 'Weekly') {
            commaSeparatedDates = getNextNWeeksDates(startDate, 3).join(',');
        }
        if (recurring_type === 'Non Stop' && recurring_duration === 'Weekly') {
            commaSeparatedDates = getNextNWeeksDates(startDate, 100).join(',');
        }
        if (recurring_type === 'Stop after 3 times repetition' && recurring_duration === 'Monthly') {
            commaSeparatedDates = getNextNMonthsDates(startDate, 3).join(',');
        }
        if (recurring_type === 'Non Stop' && recurring_duration === 'Monthly') {
            commaSeparatedDates = getNextNMonthsDates(startDate, 100).join(',');
        }

        // Process followers
        const followerArray = Array.isArray(follower) ? follower : [];

        // Parse benchmark_name
        let benchmarkNamesArray = [];
        if (typeof benchmark_name === 'string') {
            try {
                benchmarkNamesArray = JSON.parse(benchmark_name);
            } catch (error) {
                console.error('Invalid JSON for benchmark_name:', error);
                benchmarkNamesArray = [];
            }
        } else if (Array.isArray(benchmark_name)) {
            benchmarkNamesArray = benchmark_name;
        }

        const percent_per_benchmark = benchmarkNamesArray.length > 0 ? 100 / benchmarkNamesArray.length : 0;
        const benchmark_names_str = benchmarkNamesArray.map(item => item.milestoneId).join(',');

        const task_data = {
            fld_bucket_name: bucket_name,
            fld_project_name: project_name,
            fld_assign_to: assignedToArray[0], // For update, assuming 1 assigned_to
            fld_due_date: due_date,
            fld_due_time: due_time,
            fld_description: description,
            fld_title: title,
            fld_benchmark_name: benchmark_names_str,
            fld_follower: followerArray.join(','),
            fld_recurring_tasks: recurring_tasks,
            fld_recurring_duration: recurring_duration,
            fld_recurring_type: recurring_type,
            fld_recurring_days: commaSeparatedDates,
            fld_asana_link: fld_asana_link,
            fld_google_sheets_or_docs_link: google_sheets_or_docs_link,
            fld_milestone_deadline: milestone_deadline_str,
            isquerytask: (isquerytask && isquerytask == 1) ? 1 : 0,
            fld_updatedon: new Date()
        };

        // Build SQL for updating the task
        const updateTaskSql = `
            UPDATE tbl_task SET 
                fld_bucket_name = ?, fld_project_name = ?, fld_assign_to = ?, 
                fld_due_date = ?, fld_due_time = ?, fld_description = ?, fld_title = ?, 
                fld_benchmark_name = ?, fld_follower = ?, fld_recurring_tasks = ?, 
                fld_recurring_duration = ?, fld_recurring_type = ?, fld_recurring_days = ?, 
                fld_asana_link = ?, fld_google_sheets_or_docs_link = ?, fld_milestone_deadline = ?, 
                isquerytask = ?
            WHERE id = ?
        `;

        await new Promise((resolve, reject) => {
            db.query(updateTaskSql, [
                task_data.fld_bucket_name, task_data.fld_project_name, task_data.fld_assign_to,
                task_data.fld_due_date, task_data.fld_due_time, task_data.fld_description,
                task_data.fld_title, task_data.fld_benchmark_name, task_data.fld_follower,
                task_data.fld_recurring_tasks, task_data.fld_recurring_duration,
                task_data.fld_recurring_type, task_data.fld_recurring_days,
                task_data.fld_asana_link, task_data.fld_google_sheets_or_docs_link,
                task_data.fld_milestone_deadline, task_data.isquerytask, task_id
            ], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // Delete old benchmark entries
        await new Promise((resolve, reject) => {
            db.query(`DELETE FROM tbl_benchmark_percentage WHERE fld_task_id = ?`, [task_id], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // Insert updated benchmark percentages
        for (const benchmark of benchmarkNamesArray) {
            const benchmark_entry = {
                fld_task_id: task_id,
                fld_benchmark_name: benchmark.milestoneId,
                fld_benchmark_percent: percent_per_benchmark,
                fld_added_by: user_id,
                fld_admin_type: null,
                fld_addedon: new Date(),
                status: 'Active'
            };

            await new Promise((resolve, reject) => {
                db.query(`
                    INSERT INTO tbl_benchmark_percentage 
                    (fld_task_id, fld_benchmark_name, fld_benchmark_percent, fld_added_by, fld_admin_type, fld_addedon, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    benchmark_entry.fld_task_id, benchmark_entry.fld_benchmark_name,
                    benchmark_entry.fld_benchmark_percent, benchmark_entry.fld_added_by,
                    benchmark_entry.fld_admin_type, benchmark_entry.fld_addedon,
                    benchmark_entry.status
                ], (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });
        }

        res.status(200).json({ message: 'Task updated successfully!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating task', error });
    }
};



module.exports = {
    getTasks,
    closeTask,
    getTaskById,
    insertTask,
    updateTask,
    upload
};
