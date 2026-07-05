import { AdvertisementService } from "./AdvertisementService";
import { ModelService } from "./ModelService";
import { enrichAdvertisementsWithOpportunity } from "./OpportunityService";

export class DashboardService {
  private modelService = new ModelService();
  private advertisementService = new AdvertisementService();

  async getStats() {
    const [models, advertisements] = await Promise.all([
      this.modelService.getModels(),
      this.advertisementService.getAdvertisements(),
    ]);

    const averagePrice =
      advertisements.length > 0
        ? Math.round(
            advertisements.reduce((sum, ad) => sum + ad.price, 0) /
              advertisements.length
          )
        : 0;
    const rankedAdvertisements = enrichAdvertisementsWithOpportunity(
      advertisements,
      models
    );

    return {
      models: models.length,
      advertisements: advertisements.length,
      averagePrice,
      opportunities: rankedAdvertisements.filter(
        (item) =>
          item.opportunity.classification === "Chollo" ||
          item.opportunity.classification === "Oportunidad"
      ).length,
      bestAdvertisements: rankedAdvertisements.slice(0, 3),
    };
  }
}
