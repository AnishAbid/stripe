"use strict";
const { stripe } = require("../config/stripe");
const utils = require("../helpers/utils");
const CONSTANTS = require("../constants");
const calculateApplicationFeeAmount = (amount) => Math.round(0.1 * amount);

const createPaymentIntent = async function (data) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount,
      currency: "gbp",
      payment_method_types: ["card"],
      confirm: true,
      customer: data.customer_id,
      payment_method: data.payment_method,
    });
    return paymentIntent;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
      },
    };
  }
};

const checkCustomerAccountAndCreatePayment = async function () {
  try {
    /*let usersData = await userFunctions.getUserById({
            filter: {uuid: data.project.client.uuid},
            query: {stripe: 1, uuid: 1, email: 1, userName: 1}
        })
        if (usersData.data && usersData.data.stripe && usersData.data.stripe.customerId) {
            data.customerId = usersData.data.stripe.customerId
            let cards = await getCustomerCards(data)
            if(cards.data){data.cards = cards.data}
            let paymentMethod = await getCustomerPaymentMethods(data)
            if(paymentMethod.data){data.paymentMethods = paymentMethod.data}
            return await createPaymentIntent(data)
        } else if(usersData.data){
            let customer = await createCustomer(usersData.data)
            if (customer && customer.data) {
                data.customerId = customer.data.id
                return await createPaymentIntent(data)
            }
        }*/
  } catch (e) {
    return e
  }
};
const createRefund = async function (data) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: data.paymentId,
      amount: data.amount,
    });
    return utils.sucessMessage(
      CONSTANTS.STATUS.TRUE,
      "transaction  is successfully refunded.",
      refund
    );
  } catch (e) {
    return utils.errorMessage(e.code, e.message);
  }
};
const createCustomer = async function (data) {
  try {
    let customerExist = await stripe.customers.search({
      query: `email:"${data.email}"`,
      limit: 1,
    });
    if (customerExist.data.length > 0) {
      return customerExist.data[0];
    } else {
      let customer = await stripe.customers.create({
        email: data.email,
        name: data.user_name,
      });
      return customer;
    }
  } catch (e) {
    return {
      error: true,
      stripe_error: e,
    };
  }
};

const searchCustomer = async function (data) {
  try {
    const customer = await stripe.customers.search({
      query: "email:'" + data.email + "'",
    });
    return customer;
  } catch (e) {
    console.log(e, "searchCustomer");
  }
};
const deletedCustomer = async (id) => {
  try {
    const deleted = await stripe.customers.del(id);
    return deleted;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "Error while deleting customer.",
      },
    };
  }
};
const getCustomerById = async function (data) {
  try {
    const customer = await stripe.customers.retrieve(data.customerId);
    return customer;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
      },
    };
  }
};
const getCustomerCards = async function (data) {
  try {
    const cards = await stripe.paymentMethods.list({
      customer: data.customerId, //data.customerId example cus_IUQy8oMGochcZJ
      type: "card",
    });
    return cards?.data;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
      },
    };
  }
};
const getCustomerPaymentMethods = async function ({ id, type }) {
  try {
    const paymentMethods = await stripe.customers.listPaymentMethods(id, {
      type,
    });
    return paymentMethods;
    /*let paymentMethods= await  stripe.paymentMethods.list({
            customer: data.customerId,
        });
        return paymentMethods*/
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "No payment method found.",
      },
    };
  }
};
const retrievePaymentIntend = async function (data) {
  let response = await stripe.paymentIntents.retrieve(data.paymentId);
  return response;
};
////////////////////////// PAYMENT METHODS AND CARDS///////////////////////////////////////
const updateCustomerDefaultCard = async function (data) {
  try {
    const customer = await stripe.customers.update(
      data.customer_id, //customer account id example 'cus_IURiGtK1fgkVTX'
      { default_source: data.card_id } //card Id to set default card in to  customer account
    );
    return customer;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
      },
    };
  }
};
const updateCustomerDefaultPaymentMethod = async function (data) {
  try {
    const customer = await stripe.customers.update(
      data.customer_id, //customer account id example 'cus_IURiGtK1fgkVTX'
      { invoice_settings: { default_payment_method: data.payment_method_id } } //card Id to set default card in to  customer account
    );
    return customer;
  } catch (e) {
    return {
      error: true,
      stripe_error: e,
    };
  }
};
const addNewCardIntoCustomerAccount = async function (data) {
  try {
    const card = await stripe.customers.createSource(
      data.customer_id, //customer account id example 'cus_IURgFMrHTC5BGz'
      { source: data.source } //newly added card token to add card in to customer account
    );
    if (data.default) {
      data = { ...data, card_id: card.id };
      await updateCustomerDefaultCard(data);
    }
    return card;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
      },
    };
  }
};
const createCardToken = async function (data) {
  const token = await stripe.tokens.create({
    card: {
      number: data.number, //'4242424242424242',
      exp_month: data.expiry.split("")[0], //12,
      exp_year: data.expiry.split("")[1], //2021,
      cvc: data.cvc, //'314',
    },
  });
  return token;
};
const createPaymentMethodForCard = async function (data) {
  try {
    let obj = {
      type: "card",
      card: {
        number: data.number, //'4242424242424242',
        exp_month: data.expiry.split("/")[0], //12,
        exp_year: data.expiry.split("/")[1], //2021,
        cvc: data.cvc, //'314',
      },
    };
    if (data.work_email && data.card_holder_name)
      obj.billing_details = {
        email: data.work_email,
        name: data.card_holder_name,
        address: {
          city: data.city,
          line1: data.billing_address,
          postal_code: data.post_code,
        },
      };
    const paymentMethod = await stripe.paymentMethods.create(obj);
    return paymentMethod;
  } catch (e) {
    return {
      error: {
        error_code: 2,
        stripe_error: e,
        message: "Invalid card information stripe card decline.",
      },
    };
  }
};
const createPaymentMethodForDirectDebit = async function (data, user) {
  try {
    const paymentMethod = await stripe.paymentMethods.create({
      type: "bacs_debit",
      bacs_debit: {
        account_number: data.account_number,
        sort_code: data.sort_code,
      },
      billing_details: {
        email: user.work_email,
        name: data.name_on_account,
        address: {
          city: user.city,
          country: user.country.value,
          line1: user.billing_address,
          postal_code: user.post_code,
        },
      },
    });
    return paymentMethod;
  } catch (e) {
    return {
      error: {
        error_code: 2,
        stripe_error: e,
        message: "Invalid bank information stripe error.",
      },
    };
  }
};
/*bacs_debit:{
    account_number:data.bank.account_number,
        sort_code:data.bank.sort_code
},*/
const attachMethodWithCustomer = async function (data) {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(
      data.payment_method_id, //'pm_1HysqfKYfoltPq2L1IwDu7Mz',
      { customer: data.customer_id } //'cus_ISHwOz2uzAQJg9'
    );
    if (data.default) await updateCustomerDefaultPaymentMethod(data);
    return paymentMethod;
  } catch (e) {
    return {
      error: {
        error_code: 3,
        stripe_error: e,
        message: "Not able to attach card with customer",
      },
    };
  }
};
const ImplementAttachPaymentMethod = async function (data) {
  let payMeth = await createPaymentMethodForCard(data);
  if (payMeth.data) {
    return await attachMethodWithCustomer({
      paymentMethodId: payMeth.data.id,
      customerId: data.customerId,
    });
  } else {
    return payMeth;
  }
};
const adminAccountBalance = async function (data) {
  try {
    let StripBal = await stripe.balance.retrieve({
      stripeAccount: data.accountId,
    });
    return {
      available:
        StripBal.available.length > 0 ? StripBal.available[0].amount : 0,
      pending: StripBal.pending.length > 0 ? StripBal.pending[0].amount : 0,
    };
  } catch (e) {
    return e;
  }
};
////////////////////////// SUBSCRIPTIONS /////////////////////////////////////////////////
const createSubscription = async (data) => {
  try {
    let query = {
      customer: data.customer_id,
      items: [{ price: data.price_id }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
    };
    if (data.coupon) {
      query.coupon = data.coupon;
    }
    if (data.appliedTax) query.default_tax_rates = [data.appliedTax.id];
    const subscription = await stripe.subscriptions.create(query);
    return subscription;
  } catch (e) {
    return {
      error: {
        error_code: 5,
        stripe_error: e,
        message: "Error while subscription.",
      },
    };
  }
};
const subscriberSubscription = async (data) => {
  try {
    let query = {
      customer: data.customer_id,
      items: [{ price: data.price_id }],
      expand: ["latest_invoice.payment_intent"],
      trial_from_plan: false,
    };
    if (data.appliedTax) query.default_tax_rates = [data.appliedTax.id];
    const subscription = await stripe.subscriptions.create(query);
    return subscription;
  } catch (e) {
    return {
      error: {
        error_code: 5,
        stripe_error: e,
        message: "Error while subscription.",
      },
    };
  }
};
const retrieveSubscription = async (id) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      id //'sub_1KGhrN2x6R10KRrhu5RHL0yY'
    );
    return subscription;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "NO subscription found",
      },
    };
  }
};
const retrieveSubscriptionItm = async (id) => {
  const subscriptionItem = await stripe.subscriptionItems.retrieve(
    id
  );
  return subscriptionItem
};
const retrieveAllActivePlans = async () => {
  try {
    const plans = await stripe.prices.list({
      expand: ["data.product"],
      active: true,
      limit: 40
    });
    return plans;
  } catch (e) {
    return e
  }
};
const retrievePlanById = async (id) => {
  try {
    const plan = await stripe.prices.retrieve(id, { expand: ["product"] });
    return plan;
  } catch (e) {
    console.log("error", e);
  }
};
const retrieveProduct = async (id) => {
  try {
    const product = await stripe.products.retrieve(
      id || "prod_KwuJOw1YsRReCj" //data.product
    );
    return product;
  } catch (e) {
    return e
  }
};
const retrievePrice = async (id) => {
  try {
    const product = await stripe.prices.retrieve(
      id || "prod_KwuJOw1YsRReCj" //data.product
    );
    return product;
  } catch (e) {
    return e
  }
};
const updateSubscription = async (data) => {
  try {
    await stripe.subscriptions.retrieve(
      data.subscription.subscription_id
    );
    const newSubs = await stripe.subscriptions.update(
      data.subscription.subscription_id,
      {
        cancel_at_period_end: true,
        // payment_behavior: 'default_incomplete',
        proration_behavior: "none",
        expand: ["latest_invoice.payment_intent"]
        // items: [{
        //     id: old.items.data[0].id,
        //     price: data.plan.id,
        // }]
      }
    );
    return newSubs;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "Not able to switch subscription.",
      },
    };
  }
};
const cancelSubsPlan = async (id) => {
  try {
    const deleted = await stripe.subscriptions.del(id);
    return deleted;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "Not able to cancel subscription.",
      },
    };
  }
};

const cancelUnsubscribe = async (data) => {
  try {
    const newSubs = await stripe.subscriptions.update(
      data.subscription.subscription_id,
      {
        cancel_at_period_end: false,
        expand: ["latest_invoice.payment_intent"],
      }
    );
    return newSubs;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "Not able to cancel unsubscribe request.",
      },
    };
  }
};

////////////////////////// INVOICES /////////////////////////////////////////////////////
const getCustomerInvoices = async (id) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: id,
      limit: 3,
    });
    return invoices;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "Not able to get invoice.",
      },
    };
  }
};

const getCustomerSingleInvoice = async (id) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: id,
      limit: 1,
    });
    return invoices;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "Not able to get invoice.",
      },
    };
  }
};

////////////////////////// TAX Functions //////////////////////////
const getTaxList = async () => {
  try {
    const taxRates = await stripe.taxRates.list({
      limit: 3,
    });
    return taxRates ? taxRates.data : [];
  } catch (e) {
    return [];
  }
};

const createCoupon = async () => {
  try {
    const coupon = await stripe.coupons.create({
      percent_off: 25.5,
      duration: "once",
      // duration_in_months: 3,
    });
    return coupon;
  } catch (e) {
    return [];
  }
};

const checkCoupon = async (id) => {
  try {
    const coupon = await stripe.coupons.retrieve(id);
    return coupon;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "Invalid coupon!",
      },
    };
  }
};

const couponsList = async () => {
  try {
    const coupon = await stripe.coupons.list({
      limit: 20,
    });
    return coupon;
  } catch (e) {
    return e;
  }
};

const retrieveInvoice = async (invoiceId) => {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return invoice;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "No invoice retrieved!",
      },
    };
  }
};

const detachMethodWithCustomer = async (data) => {
  try {
    const paymentMethod = await stripe.paymentMethods.detach(
      data.payment_method_id
    );
    return paymentMethod;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "Error while deleting card.",
      },
    };
  }
};

const updatePaymentMethod = async (payment_method_id, data) => {
  try {
    const paymentMethod = await stripe.paymentMethods.update(
      payment_method_id,
      data
    );
    return paymentMethod;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "Error while updating card.",
      },
    };
  }
};

const confirmPaymentIntent = async (payIntent, payMethod) => {
  try {
    // To create a PaymentIntent for confirmation, see our guide at: https://stripe.com/docs/payments/payment-intents/creating-payment-intents#creating-for-automatic
    const paymentIntent = await stripe.paymentIntents.confirm(payIntent, {
      payment_method: payMethod,
    });
    return paymentIntent;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
        message: "Error while confirming payment intent.",
      },
    };
  }
};

const deleteCustomerCard = async (data) => {
  try {
    const deleted = await stripe.customers.deleteSource(
      data.customer_id,
      data.card_id
    );
    return deleted;
  } catch (e) {
    return {
      error: {
        stripe_error: e,
      },
    };
  }
};

const getCustomerIdByEmail = async (email) => {
  try {
    let customerExist = await stripe.customers.search({
      query: `email:"${email}"`,
      limit: 1,
    });
    if (customerExist.data.length > 0) return customerExist.data[0];
    return null;
  } catch (e) {
    return {
      error: true,
      stripe_error: e,
    };
  }
};

module.exports = {
  searchCustomer,
  calculateApplicationFeeAmount,
  createPaymentIntent,
  createCustomer,
  getCustomerById,
  getCustomerCards,
  createCardToken,
  ImplementAttachPaymentMethod,
  addNewCardIntoCustomerAccount,
  updateCustomerDefaultCard,
  checkCustomerAccountAndCreatePayment,
  retrievePaymentIntend,
  retrieveSubscriptionItm,
  retrieveSubscription,
  retrieveAllActivePlans,
  getCustomerPaymentMethods,
  adminAccountBalance,
  createRefund,
  createPaymentMethodForCard,
  attachMethodWithCustomer,
  createSubscription,
  createPaymentMethodForDirectDebit,
  retrieveProduct,
  retrievePlanById,
  deletedCustomer,
  getCustomerInvoices,
  updateSubscription,
  subscriberSubscription,
  cancelSubsPlan,
  getTaxList,
  getCustomerSingleInvoice,
  createCoupon,
  checkCoupon,
  couponsList,
  retrievePrice,
  retrieveInvoice,
  detachMethodWithCustomer,
  updatePaymentMethod,
  confirmPaymentIntent,
  cancelUnsubscribe,
  deleteCustomerCard,
  updateCustomerDefaultPaymentMethod,
  getCustomerIdByEmail,
};
