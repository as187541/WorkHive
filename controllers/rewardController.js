const User = require('../models/userModel');
const Reward = require('../models/rewardModel');

exports.redeemReward = async (req, res) => {
  try {
    const { rewardId } = req.body;
    const user = await User.findById(req.user._id);
    const reward = await Reward.findById(rewardId);

    if (!reward) {
      return res.status(404).json({ msg: "Reward not found" });
    }

    // Ensure wallet exists
    if (!user.wallet) {
      user.wallet = { balance: 0, history: [] };
    }

    if (user.wallet.balance < reward.cost) {
      return res.status(400).json({ msg: "Insufficient HiveTokens" });
    }

    // Deduct tokens
    user.wallet.balance -= reward.cost;
    user.wallet.history.push({
      amount: -reward.cost,
      reason: `Redeemed: ${reward.title}`,
      date: new Date()
    });

    await user.save();
    res.status(200).json({ msg: "Redemption successful!", newBalance: user.wallet.balance });
  } catch (error) {
    console.error('redeemReward error:', error);
    res.status(500).json({ msg: "Server Error" });
  }
};