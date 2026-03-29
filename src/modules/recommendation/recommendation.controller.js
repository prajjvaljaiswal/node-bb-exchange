const prisma = require('../../config/database');
const { sendSuccess } = require('../../utils/responseFormatter');

async function getRecommendations(req, res, next) {
  try {
    const nodes = await prisma.recommendationNode.findMany({
      where: { forPatientId: req.params.patientId },
      orderBy: { displayOrder: 'asc' },
      include: {
        bloodBank: { select: { id: true, name: true, city: true, state: true, contactMobile: true } },
        donorCard: { select: { donorCardDisplayId: true, bloodGroup: true, dateOfCollection: true } },
      },
    });
    sendSuccess(res, nodes);
  } catch (err) { next(err); }
}

async function cycleHistory(req, res, next) {
  try {
    const events = await prisma.donationEvent.findMany({
      where: { bloodBankId: req.params.bankId, cycleDetected: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    sendSuccess(res, events);
  } catch (err) { next(err); }
}

module.exports = { getRecommendations, cycleHistory };
