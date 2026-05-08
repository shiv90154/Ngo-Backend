const Batch = require("../models/Batch");
const BatchEnrollment = require("../models/BatchEnrollments");
const User = require("../models/user.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const mailer = require("../utils/sendEmail");

// ====================== STUDENT CONTROLLERS ======================

exports.getAvailableBatchesForStudent = catchAsync(async (req, res, next) => {
    const studentId = req.user.id;

    const student = await User.findById(studentId).select(
        "class interests fieldOfStudy grade fullName"
    );

    if (!student) {
        throw new AppError("स्टूडेंट प्रोफाइल नहीं मिला", 404);
    }

    const studentClass = student.class || student.grade;
    const studentInterests = student.interests || student.fieldOfStudy || [];

    const query = {
        isActive: true,
        isPublished: true,
        $expr: { $lt: ["$currentStudents", "$maxStudents"] },
        $or: [
            ...(studentClass ? [{ targetClasses: { $in: [studentClass] } }] : []),
            ...(studentInterests.length > 0
                ? [{ targetInterests: { $in: studentInterests } }]
                : []),
            { targetClasses: { $size: 0 }, targetInterests: { $size: 0 } },
        ],
    };

    const {
        page = 1,
        limit = 10,
        mode,
        category,
        sortBy = "startDate",
    } = req.query;

    if (mode) query.mode = mode;
    if (category) query.category = category;

    let sortOptions = {};

    switch (sortBy) {
        case "popular":
            sortOptions = { currentStudents: -1 };
            break;
        case "fee":
            sortOptions = { fee: 1 };
            break;
        case "newest":
            sortOptions = { createdAt: -1 };
            break;
        default:
            sortOptions = { startDate: 1 };
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const batches = await Batch.find(query)
        .populate("instructor", "fullName email profileImage")
        .populate("course", "title thumbnail")
        .sort(sortOptions)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

    const total = await Batch.countDocuments(query);

    const batchIds = batches.map((b) => b._id);

    const enrolledBatchIds = await BatchEnrollment.find({
        student: studentId,
        batch: { $in: batchIds },
        status: "enrolled",
    }).distinct("batch");

    const waitlistedBatchIds = await BatchEnrollment.find({
        student: studentId,
        batch: { $in: batchIds },
        status: "waitlisted",
    }).distinct("batch");

    const batchesWithStatus = batches.map((batch) => ({
        ...batch.toObject(),
        isEnrolled: enrolledBatchIds.some(
            (id) => id.toString() === batch._id.toString()
        ),
        isWaitlisted: waitlistedBatchIds.some(
            (id) => id.toString() === batch._id.toString()
        ),
        availableSeats: Math.max(0, batch.maxStudents - batch.currentStudents),
        isFull: batch.currentStudents >= batch.maxStudents,
    }));

    res.json({
        success: true,
        studentInfo: {
            name: student.fullName,
            class: studentClass,
            interests: studentInterests,
        },
        batches: batchesWithStatus,
        pagination: {
            currentPage: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            totalBatches: total,
            limit: limitNumber,
        },
    });
});

exports.getBatchFilterOptions = catchAsync(async (req, res, next) => {
    const distinctClasses = await Batch.distinct("targetClasses", {
        isPublished: true,
    });

    const distinctInterests = await Batch.distinct("targetInterests", {
        isPublished: true,
    });

    const distinctModes = await Batch.distinct("mode", {
        isPublished: true,
    });

    const distinctCategories = await Batch.distinct("category", {
        isPublished: true,
    });

    res.json({
        success: true,
        filters: {
            classes: distinctClasses.flat().filter(Boolean),
            interests: distinctInterests.flat().filter(Boolean),
            modes: distinctModes,
            categories: distinctCategories,
        },
    });
});

exports.enrollInBatch = catchAsync(async (req, res, next) => {
    const { batchId } = req.params;
    const studentId = req.user.id;

    const batch = await Batch.findById(batchId);

    if (!batch) {
        throw new AppError("बैच नहीं मिला", 404);
    }

    if (!batch.isActive || !batch.isPublished) {
        throw new AppError("यह बैच सक्रिय नहीं है", 400);
    }

    const existingEnrollment = await BatchEnrollment.findOne({
        batch: batchId,
        student: studentId,
    });

    if (existingEnrollment) {
        if (existingEnrollment.status === "enrolled") {
            return res.json({
                success: true,
                message: "आप पहले से इस बैच में एनरोल हैं",
                alreadyEnrolled: true,
            });
        }

        if (existingEnrollment.status === "waitlisted") {
            return res.json({
                success: true,
                message: "आप पहले से वेटलिस्ट में हैं",
                isWaitlisted: true,
            });
        }
    }

    if (batch.currentStudents >= batch.maxStudents) {
        await BatchEnrollment.create({
            batch: batchId,
            student: studentId,
            status: "waitlisted",
        });

        await Batch.findByIdAndUpdate(batchId, {
            $addToSet: { waitlist: studentId },
        });

        return res.json({
            success: true,
            message: "बैच फुल है, आपको वेटलिस्ट में डाल दिया गया है",
            isWaitlisted: true,
        });
    }

    const enrollment = await BatchEnrollment.create({
        batch: batchId,
        student: studentId,
        status: "enrolled",
        enrolledAt: new Date(),
    });

    await Batch.findByIdAndUpdate(batchId, {
        $inc: { currentStudents: 1 },
        $addToSet: { enrolledStudents: studentId },
    });

    try {
        const student = await User.findById(studentId);

        if (student) {
            await mailer.sendBatchEnrollmentEmail(
                student.email,
                student.fullName,
                batch.title,
                batch.startDate
            );
        }
    } catch (e) {
        console.error("बैच एनरोलमेंट ईमेल विफल:", e.message);
    }

    res.json({
        success: true,
        message: "आप सफलतापूर्वक बैच में एनरोल हो गए हैं",
        enrollment,
    });
});

exports.getMyBatches = catchAsync(async (req, res, next) => {
    const studentId = req.user.id;
    const { page = 1, limit = 10, status = "enrolled" } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const enrollments = await BatchEnrollment.find({
        student: studentId,
        status,
    })
        .populate({
            path: "batch",
            populate: [
                { path: "instructor", select: "fullName email profileImage" },
                { path: "course", select: "title thumbnail" },
            ],
        })
        .sort("-enrolledAt")
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

    const batches = enrollments.map((e) => e.batch);

    const total = await BatchEnrollment.countDocuments({
        student: studentId,
        status,
    });

    res.json({
        success: true,
        batches,
        pagination: {
            currentPage: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            totalBatches: total,
            limit: limitNumber,
        },
    });
});

exports.getBatchDetails = catchAsync(async (req, res, next) => {
    const { batchId } = req.params;
    const studentId = req.user.id;

    const batch = await Batch.findById(batchId)
        .populate("instructor", "fullName email profileImage bio")
        .populate("course", "title description thumbnail")
        .populate("enrolledStudents", "fullName email profileImage");

    if (!batch) {
        throw new AppError("बैच नहीं मिला", 404);
    }

    const enrollment = await BatchEnrollment.findOne({
        batch: batchId,
        student: studentId,
    });

    res.json({
        success: true,
        batch,
        isEnrolled: enrollment?.status === "enrolled",
        isWaitlisted: enrollment?.status === "waitlisted",
        enrollment,
    });
});

// ====================== INSTRUCTOR CONTROLLERS ======================

exports.getInstructorBatches = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 10, status = "all" } = req.query;

    const query = { instructor: req.user.id };

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;
    if (status === "published") query.isPublished = true;
    if (status === "draft") query.isPublished = false;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const batches = await Batch.find(query)
        .populate("course", "title")
        .sort("-createdAt")
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

    const total = await Batch.countDocuments(query);

    const batchesWithStats = await Promise.all(
        batches.map(async (batch) => {
            const enrolledCount = await BatchEnrollment.countDocuments({
                batch: batch._id,
                status: "enrolled",
            });

            const waitlistCount = await BatchEnrollment.countDocuments({
                batch: batch._id,
                status: "waitlisted",
            });

            const completedCount = await BatchEnrollment.countDocuments({
                batch: batch._id,
                status: "completed",
            });

            return {
                ...batch.toObject(),
                enrolledCount,
                waitlistCount,
                completedCount,
            };
        })
    );

    res.json({
        success: true,
        batches: batchesWithStats,
        pagination: {
            currentPage: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            totalBatches: total,
            limit: limitNumber,
        },
    });
});

exports.createBatch = catchAsync(async (req, res, next) => {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    const batchData = {
        ...req.body,
        instructor: req.user.id,
    };

    const batch = await Batch.create(batchData);

    res.status(201).json({
        success: true,
        message: "बैच सफलतापूर्वक बनाया गया",
        batch,
    });
});

exports.updateBatch = catchAsync(async (req, res, next) => {
    const { batchId } = req.params;

    const batch = await Batch.findOneAndUpdate(
        { _id: batchId, instructor: req.user.id },
        req.body,
        { new: true, runValidators: true }
    );

    if (!batch) {
        throw new AppError(
            "बैच नहीं मिला या आपके पास संपादन की अनुमति नहीं है",
            404
        );
    }

    res.json({
        success: true,
        message: "बैच अपडेट हो गया",
        batch,
    });
});

exports.deleteBatch = catchAsync(async (req, res, next) => {
    const { batchId } = req.params;

    const batch = await Batch.findOneAndDelete({
        _id: batchId,
        instructor: req.user.id,
    });

    if (!batch) {
        throw new AppError("बैच नहीं मिला", 404);
    }

    await BatchEnrollment.deleteMany({ batch: batchId });

    res.json({
        success: true,
        message: "बैच हटा दिया गया",
    });
});

exports.getBatchStudents = catchAsync(async (req, res, next) => {
    const { batchId } = req.params;
    const { page = 1, limit = 20, status = "enrolled" } = req.query;

    const batch = await Batch.findOne({
        _id: batchId,
        instructor: req.user.id,
    });

    if (!batch) {
        throw new AppError("बैच नहीं मिला", 404);
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const enrollments = await BatchEnrollment.find({
        batch: batchId,
        status,
    })
        .populate("student", "fullName email profileImage phoneNumber")
        .sort("-enrolledAt")
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

    const total = await BatchEnrollment.countDocuments({
        batch: batchId,
        status,
    });

    res.json({
        success: true,
        students: enrollments,
        pagination: {
            currentPage: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            totalStudents: total,
            limit: limitNumber,
        },
    });
});

exports.markAttendance = catchAsync(async (req, res, next) => {
    const { batchId } = req.params;
    const { studentId, date, status } = req.body;

    const batch = await Batch.findOne({
        _id: batchId,
        instructor: req.user.id,
    });

    if (!batch) {
        throw new AppError("बैच नहीं मिला", 404);
    }

    const enrollment = await BatchEnrollment.findOne({
        batch: batchId,
        student: studentId,
    });

    if (!enrollment) {
        throw new AppError("स्टूडेंट इस बैच में एनरोल नहीं है", 404);
    }

    const attendanceIndex = enrollment.attendance.findIndex(
        (a) => a.date.toDateString() === new Date(date).toDateString()
    );

    if (attendanceIndex > -1) {
        enrollment.attendance[attendanceIndex].status = status;
        enrollment.attendance[attendanceIndex].markedBy = req.user.id;
    } else {
        enrollment.attendance.push({
            date: new Date(date),
            status,
            markedBy: req.user.id,
        });
    }

    await enrollment.save();

    res.json({
        success: true,
        message: "उपस्थिति दर्ज कर ली गई",
        attendance: enrollment.attendance,
    });
});

exports.addAnnouncement = catchAsync(async (req, res, next) => {
    const { batchId } = req.params;
    const { title, content } = req.body;

    const batch = await Batch.findOneAndUpdate(
        { _id: batchId, instructor: req.user.id },
        {
            $push: {
                announcements: {
                    title,
                    content,
                    createdBy: req.user.id,
                    createdAt: new Date(),
                },
            },
        },
        { new: true }
    );

    if (!batch) {
        throw new AppError("बैच नहीं मिला", 404);
    }

    const enrollments = await BatchEnrollment.find({
        batch: batchId,
        status: "enrolled",
    }).populate("student", "email fullName");

    for (const enrollment of enrollments) {
        try {
            await mailer.sendBatchAnnouncement(
                enrollment.student.email,
                enrollment.student.fullName,
                batch.title,
                title,
                content
            );
        } catch (e) {
            console.error("Announcement email failed:", e);
        }
    }

    res.json({
        success: true,
        message: "घोषणा पोस्ट कर दी गई",
        announcement: batch.announcements[batch.announcements.length - 1],
    });
});