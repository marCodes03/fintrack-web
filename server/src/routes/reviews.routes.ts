import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

// GET /api/reviews
router.get('/', async (req: Request, res: Response) => {
  const userId = req.query['userId'] as string;
  try {
    const reviews = await prisma.review.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdDate: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve reviews.', error: (err as Error).message });
  }
});

// POST /api/reviews
router.post('/', async (req: Request, res: Response) => {
  const { rating, comment, userId } = req.body;

  if (rating === undefined || rating === null || !comment || !userId) {
    res.status(400).json({ success: false, message: 'Please provide rating, comment, and ensure you are logged in.' });
    return;
  }

  const numericRating = parseInt(rating, 10);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    res.status(400).json({ success: false, message: 'Rating must be a whole number between 1 and 5.' });
    return;
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      res.status(400).json({ success: false, message: 'User does not exist. Please check your credentials.' });
      return;
    }

    const review = await prisma.review.create({
      data: {
        rating: numericRating,
        comment: comment.trim(),
        userId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json({ success: true, message: 'Thank you for your feedback! Review saved successfully.', data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save review.', error: (err as Error).message });
  }
});

export default router;
