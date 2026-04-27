const User = require('../models/userModel');
const Reward = require('../models/rewardModel');

exports.redeemReward = async (req, res) => {
  try {
    const { rewardId } = req.body;
    const user = await User.findById(req.user._id);
    const reward = await Reward.findById(rewardId);

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
    res.status(500).json({ msg: "Server Error" });
  }
};