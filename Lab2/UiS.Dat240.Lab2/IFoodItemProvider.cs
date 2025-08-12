using System.Threading.Tasks;

namespace UiS.Dat240.Lab2;

public interface IFoodItemProvider
{
    Task<FoodItem[]> GetItems();
    Task AddFoodItem(FoodItem item);
    Task<FoodItem> GetFoodItem(int id);
    Task UpdateFoodItem(int id, FoodItem item);
    Task RemoveFoodItem(int id);
}
